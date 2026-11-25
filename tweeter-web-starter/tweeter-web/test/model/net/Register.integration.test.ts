/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it, jest } from "@jest/globals";
import { AuthToken, User } from "tweeter-shared";
import { DynamoDBClient } from "../../../../tweeter-server/node_modules/@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "../../../../tweeter-server/node_modules/@aws-sdk/lib-dynamodb";
import { HeadObjectCommand, S3Client } from "../../../../tweeter-server/node_modules/@aws-sdk/client-s3";
import { compare } from "../../../../tweeter-server/node_modules/bcryptjs";
import { S3ImageDAO } from "../../../../tweeter-server/src/model/dao/s3/S3ImageDAO";
import { DynamoUserDAO } from "../../../../tweeter-server/src/model/dao/dynamodb/DynamoUserDAO";
import { DynamoAuthTokenDAO } from "../../../../tweeter-server/src/model/dao/dynamodb/DynamoAuthTokenDAO";
import { shouldDeleteTestData, clearTestRecord } from "../../../../tweeter-server/test/helpers/liveTestData.cjs";
import { ServerFacade } from "../../../src/model/net/ServerFacade";

// Requires a SEPARATE deployment of registration, its bucket/policy/env, and layer.
// Run sequentially; this suite exclusively owns @integration-register-api.
// DELETE_TEST_DATA=false keeps the profile/photo and login session for inspection.
// Returned session keys are journaled on the owned profile for later reset/clear.
// A lost response/process exit before journaling may leave an unknown session.
describe("ServerFacade registration with live DynamoDB/S3 persistence", () => {
  it("stores the hash/photo, signs in, rejects duplicates, and supports later login", async () => {
    const tableName = process.env.USER_TABLE_NAME;
    const authTableName = process.env.AUTH_TOKEN_TABLE_NAME;
    const bucket = process.env.PROFILE_IMAGE_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    if (!tableName || !authTableName || !bucket?.trim() || !region?.trim() ||
        ![tableName, authTableName].every(name => /^[A-Za-z0-9_.-]{3,255}$/.test(name))) {
      throw new Error("Set actual USER_TABLE_NAME, AUTH_TOKEN_TABLE_NAME, PROFILE_IMAGE_BUCKET_NAME and AWS_REGION matching the deployed API");
    }
    const deleteTestData = shouldDeleteTestData();
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
    const s3 = new S3Client({ region });
    const images = new S3ImageDAO(bucket, region, s3);
    const users = new DynamoUserDAO(tableName, client);
    const sessions = new DynamoAuthTokenDAO(authTableName, client);
    const facade = new ServerFacade();
    const request = {
      firstName: "RegistrationApiFixture", lastName: "OwnedIntegration", alias: "@integration-register-api",
      password: "integration-registration-only-password",
      imageStringBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/5ncLrgAAAABJRU5ErkJggg==",
      imageFileExtension: "png",
    };
    const fixture = { tableName, key: { alias: request.alias }, ownerAttribute: "firstName", ownerValue: request.firstName };
    const issued = new Set<string>();
    let attempted = false;

    async function clearSession(token: string) {
      await clearTestRecord(client, {
        tableName: authTableName!, key: { token }, ownerAttribute: "userAlias", ownerValue: request.alias,
      });
    }

    async function resetOwnedFixture() {
      const { Item: stored } = await client.send(new GetCommand({ TableName: tableName, Key: fixture.key, ConsistentRead: true }));
      if (stored) {
        if (stored.firstName !== request.firstName || stored.lastName !== request.lastName) {
          throw new Error("Refusing to reset another owner's registration fixture");
        }
        const tokens: unknown = stored.registrationTestTokens ?? [];
        if (!Array.isArray(tokens) || tokens.some(token => typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token))) {
          throw new Error("Invalid registration session journal");
        }
        for (const token of tokens as string[]) await clearSession(token);
        const url = new URL(stored.imageUrl);
        if (url.protocol !== "https:" || url.host !== `${bucket}.s3.${region}.amazonaws.com` || url.search || url.hash ||
            !/^\/profile-images\/[0-9a-f]{64}\.png$/.test(url.pathname)) {
          throw new Error("Refusing to delete an unexpected registration image");
        }
        const id = url.pathname.substring(1);
        await images.deleteImage(id);
        try {
          await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: id }));
          throw new Error("Registration image remains after deletion");
        } catch (error) {
          if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error;
        }
      }
      // Delete the profile/journal last, retaining cleanup references on failure.
      await clearTestRecord(client, fixture);
    }

    async function remember(token: AuthToken) {
      issued.add(token.token);
      expect(token.token).toMatch(/^[0-9a-f]{64}$/);
      try {
        await client.send(new UpdateCommand({
          TableName: tableName, Key: fixture.key,
          UpdateExpression: "SET registrationTestTokens = list_append(if_not_exists(registrationTestTokens, :empty), :tokens)",
          ConditionExpression: "firstName = :owner AND lastName = :last",
          ExpressionAttributeValues: { ":empty": [], ":tokens": [token.token], ":owner": request.firstName, ":last": request.lastName },
        }));
      } catch (error) {
        await clearSession(token.token);
        issued.delete(token.token);
        throw error;
      }
    }

    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      await resetOwnedFixture();
      expect(await users.getUserByAlias(request.alias)).toBeNull();
      const started = Date.now();
      attempted = true;
      const [profile, registrationToken] = await facade.register(request);
      await remember(registrationToken);
      expect(profile).toBeInstanceOf(User);
      expect(profile.dto).toMatchObject({ firstName: request.firstName, lastName: request.lastName, alias: request.alias });
      expect(registrationToken).toBeInstanceOf(AuthToken);
      expect(registrationToken.timestamp).toBeGreaterThanOrEqual(started);
      expect(registrationToken.timestamp).toBeLessThanOrEqual(Date.now());
      expect(await sessions.getAuthToken(registrationToken.token)).toEqual({
        token: registrationToken.token, userAlias: request.alias, lastActiveTimestamp: registrationToken.timestamp,
      });
      const passwordHash = await users.getPasswordHash(request.alias);
      expect(await compare(request.password, passwordHash!)).toBe(true);
      expect(profile).not.toHaveProperty("passwordHash");
      expect(JSON.stringify(profile)).not.toContain(passwordHash!);
      expect((await users.getUserByAlias(request.alias))?.dto).toEqual(profile.dto);
      const imageResponse = await fetch(profile.imageUrl);
      expect(imageResponse.status).toBe(200);
      expect(imageResponse.headers.get("content-type")).toBe("image/png");
      expect(Buffer.from(await imageResponse.arrayBuffer())).toEqual(Buffer.from(request.imageStringBase64, "base64"));
      expect((await facade.getUser({ token: registrationToken.token, alias: request.alias }))?.dto).toEqual(profile.dto);
      expect((await sessions.getAuthToken(registrationToken.token))!.lastActiveTimestamp).toBeGreaterThan(registrationToken.timestamp);
      await expect(facade.register({ ...request, firstName: "DuplicateAttempt" }))
        .rejects.toThrow("bad-request: Alias already registered");
      expect((await users.getUserByAlias(request.alias))?.dto).toEqual(profile.dto);
      expect(await users.getPasswordHash(request.alias)).toBe(passwordHash);
      const [loggedIn, loginToken] = await facade.login({ alias: request.alias, password: request.password });
      await remember(loginToken);
      expect(loggedIn.dto).toEqual(profile.dto);
      expect(loginToken.token).not.toBe(registrationToken.token);
      await facade.logout({ token: registrationToken.token });
      expect(await sessions.getAuthToken(registrationToken.token)).toBeNull();
      expect((await facade.getUser({ token: loginToken.token, alias: request.alias }))?.dto).toEqual(profile.dto);
    } finally {
      try {
        if (deleteTestData) {
          for (const token of issued) await clearSession(token);
          if (attempted) await resetOwnedFixture();
        } else if (attempted) {
          console.log(`KEPT: ${request.alias}, its S3 photo, and journaled login session; next run resets owned fixtures`);
        }
      } finally {
        consoleError.mockRestore();
        s3.destroy();
        client.destroy();
      }
    }
  }, 60000);
});

// From tweeter-web, AFTER separately requested deployment, set the actual
// USER_TABLE_NAME, AUTH_TOKEN_TABLE_NAME, AWS_REGION, and PROFILE_IMAGE_BUCKET_NAME
// (the new stack output ProfileImageBucketName). Then:
// $env:DELETE_TEST_DATA = "true" # Default; false keeps owned fixtures.
// npm run test:integration:register
