// AI-assisted: see AI-ATTRIBUTION.md
// Live DynamoDB test. Run explicitly with USER_TABLE_NAME and AWS_REGION set.
// Requires AWS credentials permitting GetItem, PutItem, and DeleteItem.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { User } = require("tweeter-shared");
const { DynamoUserDAO } = require("../dist/model/dao/dynamodb/DynamoUserDAO.js");

async function testUserDAO() {
  const tableName = process.env.USER_TABLE_NAME;
  const region = process.env.AWS_REGION;
  assert.ok(tableName?.trim(), "Set USER_TABLE_NAME to the deployed user table name");
  assert.ok(region?.trim(), "Set AWS_REGION to the table's AWS region");

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  const dao = new DynamoUserDAO(tableName, client);
  const alias = "@dao-verify-" + randomUUID();
  const user = new User("DAO", "Verification", alias, "https://example.com/dao-test.png");
  // DAO storage test only: hashing and password checking belong to the service.
  const passwordHash = "synthetic-test-hash-not-a-real-password";
  let created = false;

  try {
    assert.equal(await dao.getUserByAlias(alias), null);
    assert.equal(await dao.getPasswordHash(alias), null);
    console.log("PASS: missing user and password-hash lookups return null");

    created = await dao.createUser(user, passwordHash);
    assert.equal(created, true);
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
      if (created) {
        // Only delete our unique alias if it still has the expected test hash.
        await client.send(new DeleteCommand({
          TableName: tableName,
          Key: { alias },
          ConditionExpression: "passwordHash = :expectedHash",
          ExpressionAttributeValues: { ":expectedHash": passwordHash },
        }));
        const result = await client.send(new GetCommand({
          TableName: tableName, Key: { alias }, ConsistentRead: true,
        }));
        assert.equal(result.Item, undefined);
        console.log("PASS: temporary record deleted and absence verified");
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
