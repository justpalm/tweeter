// AI-assisted: see AI-ATTRIBUTION.md
// Live DynamoDB test. Run explicitly with USER_TABLE_NAME and AWS_REGION set.
// Requires AWS credentials permitting GetItem, PutItem, and DeleteItem.
const assert = require("node:assert/strict");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { User } = require("tweeter-shared");
const { DynamoUserDAO } = require("../dist/model/dao/dynamodb/DynamoUserDAO.js");
const { shouldDeleteTestData, clearTestRecord } = require("./helpers/liveTestData.cjs");

async function testUserDAO() {
  const tableName = process.env.USER_TABLE_NAME;
  const region = process.env.AWS_REGION;
  assert.ok(tableName?.trim(), "Set USER_TABLE_NAME to the deployed user table name");
  assert.ok(region?.trim(), "Set AWS_REGION to the table's AWS region");
  const deleteTestData = shouldDeleteTestData();

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  const dao = new DynamoUserDAO(tableName, client);
  // Stable fixture key lets subsequent runs find and clear retained data.
  // Run this suite sequentially against a given table.
  const alias = "@integration-user-dao";
  const user = new User("DAO", "Verification", alias, "https://example.com/dao-test.png");
  // DAO storage test only: hashing and password checking belong to the service.
  const passwordHash = "synthetic-test-hash-not-a-real-password";
  const fixture = {
    tableName, key: { alias }, ownerAttribute: "passwordHash", ownerValue: passwordHash,
  };
  let prepared = false;

  try {
    if (await clearTestRecord(client, fixture)) {
      console.log("RESET: removed test user retained by an earlier run");
    }
    prepared = true;
    assert.equal(await dao.getUserByAlias(alias), null);
    assert.equal(await dao.getPasswordHash(alias), null);
    console.log("PASS: missing user and password-hash lookups return null");

    assert.equal(await dao.createUser(user, passwordHash), true);
    const retrieved = await dao.getUserByAlias(alias);
    assert.ok(retrieved instanceof User);
    assert.deepEqual(retrieved.dto, user.dto);
    assert.equal("passwordHash" in retrieved, false);
    assert.equal(JSON.stringify(retrieved).includes(passwordHash), false);
    assert.equal(await dao.getPasswordHash(alias), passwordHash);
    console.log("PASS: account created; profile and hash retrieved separately");

    const replacement = new User("Overwrite", "Attempt", alias, "https://example.com/other.png");
    assert.equal(await dao.createUser(replacement, "replacement-hash"), false);
    assert.deepEqual((await dao.getUserByAlias(alias)).dto, user.dto);
    assert.equal(await dao.getPasswordHash(alias), passwordHash);
    console.log("PASS: duplicate rejected; original profile and hash preserved");
  } finally {
    try {
      if (prepared && deleteTestData) {
        await clearTestRecord(client, fixture);
        console.log("PASS: temporary record deleted and absence verified");
      } else if (prepared) {
        console.log(`KEPT: inspect alias ${alias} in table ${tableName}`);
      }
    } catch (error) {
      console.error(`Cleanup failed for temporary alias ${alias} in ${tableName}`);
      throw error;
    } finally {
      client.destroy();
    }
  }
}

testUserDAO().catch(error => {
  console.error(error);
  process.exitCode = 1;
});


// Running Script
// $env:USER_TABLE_NAME = "tweeter-server-UserTable-1JI2ZWJBA00CW"
// $env:AWS_REGION = "us-east-2"
// $env:DELETE_TEST_DATA = "false" # Keep the test user for AWS console inspection.
// $env:DELETE_TEST_DATA = "true"  # Default: clear old fixture, test, then clean up.
// npm run test:integration:user-dao
