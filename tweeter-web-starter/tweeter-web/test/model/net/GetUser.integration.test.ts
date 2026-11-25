/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it } from "@jest/globals";
import { DynamoDBClient } from "../../../../tweeter-server/node_modules/@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "../../../../tweeter-server/node_modules/@aws-sdk/lib-dynamodb";
import { DynamoUserDAO } from "../../../../tweeter-server/src/model/dao/dynamodb/DynamoUserDAO";
import { shouldDeleteTestData, clearTestRecord } from "../../../../tweeter-server/test/helpers/liveTestData.cjs";
import { User } from "tweeter-shared";
import { ServerFacade } from "../../../src/model/net/ServerFacade";

// Live-test pattern: arrange through a DAO, act through ServerFacade, assert, clean up.
// Requires AWS credentials and the user table used by the deployed API in ServerFacade.
// Give each future suite its own stable key; run a given suite sequentially.
describe("ServerFacade getUser with live DynamoDB persistence", () => {
  it("returns null before creation and the persisted profile afterward", async () => {
    const tableName = process.env.USER_TABLE_NAME;
    const region = process.env.AWS_REGION;
    if (!tableName?.trim() || !region?.trim()) {
      throw new Error("Set USER_TABLE_NAME and AWS_REGION for the deployed API's user table");
    }
    if (!/^[A-Za-z0-9_.-]{3,255}$/.test(tableName)) {
      throw new Error("USER_TABLE_NAME must be your actual DynamoDB table name; replace placeholders such as <deployed user table>");
    }
    const deleteTestData = shouldDeleteTestData();
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
    const dao = new DynamoUserDAO(tableName, client);
    const facade = new ServerFacade();
    const expectedProfile = {
      firstName: "API", lastName: "Integration", alias: "@integration-get-user-api",
      imageUrl: "https://example.com/get-user-api-test.png",
    };
    const passwordHash = "get-user-api-test-only-hash";
    const fixture = {
      tableName, key: { alias: expectedProfile.alias },
      ownerAttribute: "passwordHash", ownerValue: passwordHash,
    };
    // Replace with a real session once server-side session validation is implemented.
    const request = {
      token: process.env.TEST_AUTH_TOKEN ?? "get-user-integration-token",
      alias: expectedProfile.alias,
    };
    let prepared = false;

    try {
      // Arrange: remove this suite's prior fixture, even after a keep-data run.
      if (await clearTestRecord(client, fixture)) {
        console.log("RESET: removed getUser API fixture retained by an earlier run");
      }
      prepared = true;
      await expect(facade.getUser(request)).resolves.toBeNull();
      const user = new User(
        expectedProfile.firstName, expectedProfile.lastName,
        expectedProfile.alias, expectedProfile.imageUrl,
      );
      expect(await dao.createUser(user, passwordHash)).toBe(true);

      // Act: use the real client, public API, Lambda, service, factory, and DAO.
      const retrieved = await facade.getUser(request);

      // Assert: expected values come from our fixture, not from reading the DAO back.
      expect(retrieved).toBeInstanceOf(User);
      expect(retrieved?.dto).toEqual(expectedProfile);
      expect(retrieved?.name).toBe("API Integration");
      expect(retrieved).not.toHaveProperty("passwordHash");
      expect(JSON.stringify(retrieved)).not.toContain(passwordHash);
    } finally {
      try {
        if (prepared && deleteTestData) {
          await clearTestRecord(client, fixture);
          // Check deletion through the deployed feature as well as the helper's DB read.
          await expect(facade.getUser(request)).resolves.toBeNull();
          console.log("CLEANED: getUser API fixture deleted and absence verified");
        } else if (prepared) {
          console.log(`KEPT: inspect ${expectedProfile.alias} in ${tableName}`);
        }
      } catch (error) {
        console.error(`Cleanup failed for ${expectedProfile.alias} in ${tableName}`);
        throw error;
      } finally {
        client.destroy();
      }
    }
  }, 60000);
});


// From tweeter-web; this is the current deployed user table's actual name:
// $env:USER_TABLE_NAME = "tweeter-server-UserTable-1JI2ZWJBA00CW"
// $env:AWS_REGION = "us-east-2"
// $env:DELETE_TEST_DATA = "true" # Delete after testing (default); false keeps for inspection.
// npm run test:integration:get-user
