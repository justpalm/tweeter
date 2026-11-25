// AI-assisted: see AI-ATTRIBUTION.md
// Local service + real AWS DAOs, NOT the deployed API. Run sequentially with AWS table/region env vars.
const assert = require("node:assert/strict");
const { setTimeout: delay } = require("node:timers/promises");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { User } = require("tweeter-shared");
const { AWSDAOFactory } = require("../dist/model/dao/factory/AWSDAOFactory.js");
const { FollowService } = require("../dist/model/service/FollowService.js");
const { clearTestRecord, shouldDeleteTestData } = require("./helpers/liveTestData.cjs");

async function main() {
  const { USER_TABLE_NAME: users, AUTH_TOKEN_TABLE_NAME: sessions, FOLLOW_TABLE_NAME: follows,
    FOLLOW_INDEX_NAME: index, AWS_REGION: region } = process.env;
  assert.ok([users, sessions, follows, index, region].every(x => x?.trim()), "Set user/session/follow table, index, and region variables");
  // Applies to factory-created clients too; low-capacity live tables need bounded backoff.
  process.env.AWS_RETRY_MODE = "adaptive";
  process.env.AWS_MAX_ATTEMPTS = "12";
  const cleanup = shouldDeleteTestData();
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region, retryMode: "adaptive", maxAttempts: 12 }));
  const factory = new AWSDAOFactory();
  const service = new FollowService(factory);
  const actor = new User("Follow", "Actor", "@integration-follow-service-a", "https://example.com/a.png");
  const target = new User("Follow", "Target", "@integration-follow-service-b", "https://example.com/b.png");
  const token = "integration-follow-service-session-not-a-login-token";
  const owner = "follow-service-fixture-not-a-password";
  let prepared = false;
  async function clear() {
    for (const user of [actor, target]) {
      const hash = await factory.getUserDAO().getPasswordHash(user.alias);
      assert.ok(hash === null || hash === owner, `Unowned test alias: ${user.alias}`);
    }
    await clearTestRecord(client, { tableName: follows,
      key: { follower_handle: actor.alias, followee_handle: target.alias }, ownerAttribute: "follower_handle", ownerValue: actor.alias });
    await clearTestRecord(client, { tableName: sessions, key: { token }, ownerAttribute: "userAlias", ownerValue: actor.alias });
    for (const { alias } of [actor, target]) await clearTestRecord(client,
      { tableName: users, key: { alias }, ownerAttribute: "passwordHash", ownerValue: owner });
  }
  try {
    await clear();
    prepared = true;
    for (const user of [actor, target]) assert.equal(await factory.getUserDAO().createUser(user, owner), true);
    assert.equal(await factory.getAuthTokenDAO().createAuthToken({ token, userAlias: actor.alias, lastActiveTimestamp: Date.now() }), true);
    assert.deepEqual(await service.follow(token, target.alias), [1, 0]);
    assert.equal(await service.getFollowerCount(token, target.alias), 1);
    assert.equal(await service.getFolloweeCount(token, actor.alias), 1);
    assert.equal(await service.isFollowing(token, actor.alias, target.alias), true);
    await assert.rejects(service.isFollowing(token, target.alias, actor.alias), /unauthorized:/);
    await assert.rejects(service.follow(token, actor.alias), /bad-request:/);
    await assert.rejects(service.follow(token, target.alias), /Already following/);
    assert.deepEqual(await service.loadMoreFollowees(token, actor.alias, 1, null), [[target.dto], false]);
    for (let attempt = 0; ; attempt++) {
      const page = await service.loadMoreFollowers(token, target.alias, 1, null);
      if (page[0].length) { assert.deepEqual(page, [[actor.dto], false]); break; }
      assert.ok(attempt < 39, "Follower GSI did not converge");
      await delay(250);
    }
    const storedSession = await factory.getAuthTokenDAO().getAuthToken(token);
    assert.equal(storedSession.userAlias, actor.alias);
    assert.ok(storedSession.lastActiveTimestamp <= Date.now());
    assert.deepEqual(await service.unfollow(token, target.alias), [0, 0]);
    await assert.rejects(service.unfollow(token, target.alias), /Not following/);
    await factory.getAuthTokenDAO().deleteAuthToken(token);
    for (const operation of [() => service.follow(token, target.alias), () => service.unfollow(token, target.alias),
      () => service.isFollowing(token, actor.alias, target.alias), () => service.getFollowerCount(token, target.alias),
      () => service.getFolloweeCount(token, actor.alias), () => service.loadMoreFollowers(token, target.alias, 1, null),
      () => service.loadMoreFollowees(token, actor.alias, 1, null)]) await assert.rejects(operation(), /unauthorized:/);
    assert.equal(await factory.getFollowDAO().isFollowing(actor.alias, target.alias), false);
    assert.deepEqual(await factory.getFollowDAO().getCounts(actor.alias), { followerCount: 0, followeeCount: 0 });
    assert.deepEqual(await factory.getFollowDAO().getCounts(target.alias), { followerCount: 0, followeeCount: 0 });
    console.log("PASS: all seven local service operations with real AWS storage, stored-owner checks, and revoked-session rejection");
  } finally {
    try {
      if (prepared && cleanup) { await clear(); console.log("CLEANED: service users/session/edge; absence verified"); }
      else if (prepared) console.log(`KEPT: owned users ${actor.alias}, ${target.alias}`);
    } finally { client.destroy(); }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
