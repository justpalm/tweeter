/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it, jest } from "@jest/globals";
import { DynamoDBClient } from "../../../../tweeter-server/node_modules/@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "../../../../tweeter-server/node_modules/@aws-sdk/lib-dynamodb";
import { hash } from "../../../../tweeter-server/node_modules/bcryptjs";
import { DynamoUserDAO } from "../../../../tweeter-server/src/model/dao/dynamodb/DynamoUserDAO";
import { DynamoAuthTokenDAO } from "../../../../tweeter-server/src/model/dao/dynamodb/DynamoAuthTokenDAO";
import { shouldDeleteTestData, clearTestRecord } from "../../../../tweeter-server/test/helpers/liveTestData.cjs";
import { AuthToken, User } from "tweeter-shared";
import { ServerFacade } from "../../../src/model/net/ServerFacade";

// Requires a SEPARATE deployment of persistent login and the bcryptjs layer.
// Use matching USER_TABLE_NAME, AUTH_TOKEN_TABLE_NAME, AWS_REGION, and API.
// Run this suite sequentially. It owns @integration-login-api exclusively.
// DELETE_TEST_DATA=false retains the user and second session for inspection.
// The user fixture journals issued token keys so a later run can clear them
// without scanning either table, including after a keep run or test failure.
// A lost response or process exit before journaling can leave an unknown session.
describe("ServerFacade login with live persisted credentials/sessions", () => {
  it("checks credentials, issues independent sessions, refreshes, and logs out", async () => {
    const tableName = process.env.USER_TABLE_NAME;
    const authTableName = process.env.AUTH_TOKEN_TABLE_NAME;
    const region = process.env.AWS_REGION;
    if (!tableName || !authTableName || !region?.trim() ||
        ![tableName, authTableName].every(name => /^[A-Za-z0-9_.-]{3,255}$/.test(name))) {
      throw new Error("Set actual USER_TABLE_NAME, AUTH_TOKEN_TABLE_NAME, and AWS_REGION matching the deployed API");
    }
    const deleteTestData = shouldDeleteTestData();
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
    const users = new DynamoUserDAO(tableName, client);
    const sessions = new DynamoAuthTokenDAO(authTableName, client);
    const facade = new ServerFacade();
    const user = new User("Login", "Integration", "@integration-login-api", "https://example.com/integration-login-api-owned.png");
    const password = "integration-login-only-password";
    const passwordHash = await hash(password, 10);
    const userFixture = {
      tableName, key: { alias: user.alias }, ownerAttribute: "imageUrl", ownerValue: user.imageUrl,
    };
    const issued = new Set<string>();
    let created = false;

    async function clearSession(token: string) {
      await clearTestRecord(client, {
        tableName: authTableName!, key: { token }, ownerAttribute: "userAlias", ownerValue: user.alias,
      });
    }

    async function resetOwnedFixture() {
      const { Item: stored } = await client.send(new GetCommand({
        TableName: tableName, Key: userFixture.key, ConsistentRead: true,
      }));
      if (stored) {
        if (stored.imageUrl !== user.imageUrl) throw new Error("Refusing to reset another owner's login fixture");
        const tokens: unknown = stored.loginTestTokens ?? [];
        if (!Array.isArray(tokens) || tokens.some(token => typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token))) {
          throw new Error("Invalid token journal on the owned login fixture");
        }
        for (const token of tokens as string[]) await clearSession(token);
      }
      // Remove the journal only after every recorded session is verified absent.
      await clearTestRecord(client, userFixture);
    }

    async function loginAndRemember(): Promise<[User, AuthToken]> {
      const result = await facade.login({ alias: user.alias, password });
      const token = result[1].token;
      issued.add(token); // Also clean up if journaling fails in this process.
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      try {
        await client.send(new UpdateCommand({
          TableName: tableName, Key: userFixture.key,
          UpdateExpression: "SET loginTestTokens = list_append(if_not_exists(loginTestTokens, :empty), :tokens)",
          ConditionExpression: "imageUrl = :owner",
          ExpressionAttributeValues: { ":empty": [], ":tokens": [token], ":owner": user.imageUrl },
        }));
      } catch (error) {
        // Do not intentionally retain a session that a later run cannot find.
        await clearSession(token);
        issued.delete(token);
        throw error;
      }
      return result;
    }

    // ClientCommunicator reports expected HTTP failures to console.error.
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      await resetOwnedFixture();
      await expect(facade.login({ alias: user.alias, password })).rejects.toThrow("unauthorized: Invalid alias or password");
      expect(await users.createUser(user, passwordHash)).toBe(true);
      created = true;
      await expect(facade.login({ alias: user.alias, password: "wrong-password" }))
        .rejects.toThrow("unauthorized: Invalid alias or password");

      const started = Date.now();
      const [profile, first] = await loginAndRemember();
      expect(profile).toBeInstanceOf(User);
      expect(profile.dto).toEqual(user.dto);
      expect(first).toBeInstanceOf(AuthToken);
      expect(first.timestamp).toBeGreaterThanOrEqual(started);
      expect(first.timestamp).toBeLessThanOrEqual(Date.now());
      expect(JSON.stringify(profile)).not.toContain(passwordHash);
      expect(await sessions.getAuthToken(first.token)).toEqual({
        token: first.token, userAlias: user.alias, lastActiveTimestamp: first.timestamp,
      });
      const [, second] = await loginAndRemember();
      expect(second.token).not.toBe(first.token);
      expect((await sessions.getAuthToken(second.token))?.userAlias).toBe(user.alias);
      expect((await facade.getUser({ token: first.token, alias: user.alias }))?.dto).toEqual(user.dto);
      expect((await sessions.getAuthToken(first.token))!.lastActiveTimestamp).toBeGreaterThan(first.timestamp);
      await facade.logout({ token: first.token });
      expect(await sessions.getAuthToken(first.token)).toBeNull();
      await expect(facade.getUser({ token: first.token, alias: user.alias })).rejects.toThrow("unauthorized:");
      expect((await facade.getUser({ token: second.token, alias: user.alias }))?.dto).toEqual(user.dto);
    } finally {
      try {
        if (deleteTestData) {
          for (const token of issued) await clearSession(token);
          if (created) await resetOwnedFixture();
        } else if (created) {
          console.log(`KEPT: ${user.alias} and its journaled session; a later run resets these owned fixtures`);
        }
      } finally {
        consoleError.mockRestore();
        client.destroy();
      }
    }
  }, 60000);
});

// From tweeter-web, AFTER the separately requested deployment:
// $env:USER_TABLE_NAME = "tweeter-server-UserTable-1JI2ZWJBA00CW"
// $env:AUTH_TOKEN_TABLE_NAME = "tweeter-server-AuthTokenTable-1SYRKWUL78X2E"
// $env:AWS_REGION = "us-east-2"
// $env:DELETE_TEST_DATA = "true" # Default; false keeps the owned fixtures.
// npm run test:integration:login
