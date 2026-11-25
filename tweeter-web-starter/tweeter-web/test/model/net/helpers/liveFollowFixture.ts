// AI-assisted: see AI-ATTRIBUTION.md
// Sequential, explicitly invoked live tests only. Stable fixture names support keep/reset.
import { strict as assert } from "node:assert";
import { setTimeout as delay } from "node:timers/promises";
import { DynamoDBClient } from "../../../../../tweeter-server/node_modules/@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "../../../../../tweeter-server/node_modules/@aws-sdk/lib-dynamodb";
import { DynamoUserDAO } from "../../../../../tweeter-server/src/model/dao/dynamodb/DynamoUserDAO";
import { DynamoAuthTokenDAO } from "../../../../../tweeter-server/src/model/dao/dynamodb/DynamoAuthTokenDAO";
import { clearTestRecord, shouldDeleteTestData } from "../../../../../tweeter-server/test/helpers/liveTestData.cjs";
import { User } from "tweeter-shared";
import { ServerFacade } from "../../../../src/model/net/ServerFacade";

export async function withFollowFixture(name: string, test: (fixture: {
  api: ServerFacade; users: User[]; tokens: string[]; call: <T>(operation: () => Promise<T>) => Promise<T>;
}) => Promise<void>): Promise<void> {
  const { USER_TABLE_NAME: userTable, AUTH_TOKEN_TABLE_NAME: sessionTable,
    FOLLOW_TABLE_NAME: followTable, AWS_REGION: region } = process.env;
  assert.ok([userTable, sessionTable, followTable, region].every(x => x?.trim()),
    "Set USER_TABLE_NAME, AUTH_TOKEN_TABLE_NAME, FOLLOW_TABLE_NAME, and AWS_REGION matching the API");
  const cleanup = shouldDeleteTestData();
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region, retryMode: "adaptive", maxAttempts: 12 }));
  const usersDAO = new DynamoUserDAO(userTable!, client);
  const sessionsDAO = new DynamoAuthTokenDAO(sessionTable!, client);
  const users = ["a", "b", "c"].map(x => new User("Follow", x, `@integration-follow-api-${name}-${x}`,
    `https://example.com/follow-api-${name}-${x}.png`));
  const tokens = [0, 2].map(i => `integration-follow-api-${name}-${i}-owned-session`);
  const owner = `follow-api-${name}-fixture-not-a-password`;
  const edges = [[0, 1], [0, 2], [2, 1]];
  const originalFetch = globalThis.fetch;
  let prepared = false;
  async function clear() {
    for (const user of users) {
      const hash = await usersDAO.getPasswordHash(user.alias);
      assert.ok(hash === null || hash === owner, `Unowned fixture: ${user.alias}`);
    }
    for (const [from, to] of edges) await clearTestRecord(client, { tableName: followTable!,
      key: { follower_handle: users[from].alias, followee_handle: users[to].alias },
      ownerAttribute: "follower_handle", ownerValue: users[from].alias });
    for (const [i, token] of tokens.entries()) await clearTestRecord(client, { tableName: sessionTable!,
      key: { token }, ownerAttribute: "userAlias", ownerValue: users[i === 0 ? 0 : 2].alias });
    for (const { alias } of users) await clearTestRecord(client, { tableName: userTable!,
      key: { alias }, ownerAttribute: "passwordHash", ownerValue: owner });
  }
  try {
    await clear();
    prepared = true;
    for (const user of users) assert.equal(await usersDAO.createUser(user, owner), true);
    for (const [i, token] of tokens.entries()) assert.equal(await sessionsDAO.createAuthToken({
      token, userAlias: users[i === 0 ? 0 : 2].alias, lastActiveTimestamp: Date.now(),
    }), true);
    // Observe real responses, including expected errors, without replacing network calls.
    globalThis.fetch = async (...args) => {
      const response = await originalFetch(...args);
      assert.equal(response.headers.get("access-control-allow-origin"), "*");
      return response;
    };
    // Pace requests to the existing low-capacity tables; API failures are not retried or hidden.
    await test({ api: new ServerFacade(), users, tokens,
      call: async operation => { await delay(1500); return operation(); } });
  } finally {
    globalThis.fetch = originalFetch;
    try {
      if (prepared && cleanup) await clear();
      else if (prepared) console.log(`KEPT: follow API ${name} fixtures (users, sessions, relationships)`);
    } finally { client.destroy(); }
  }
}
