// AI-assisted: see AI-ATTRIBUTION.md
const assert = require("node:assert/strict");
const { DeleteCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

// Shared by live tests. Omission means clean up; reject typos before making requests.
function shouldDeleteTestData(value = process.env.DELETE_TEST_DATA ?? "true") {
  assert.ok(value === "true" || value === "false", "DELETE_TEST_DATA must be true or false");
  return value === "true";
}

/**
 * Reset a known test record, including one retained by a previous run.
 * Each suite must use a stable, distinct key and a test-only ownership value.
 * A record with a different ownership value is never deleted.
 */
async function clearTestRecord(client, { tableName, key, ownerAttribute, ownerValue }) {
  const partitionKey = Object.keys(key)[0];
  const result = await client.send(new DeleteCommand({
    TableName: tableName,
    Key: key,
    ConditionExpression: "attribute_not_exists(#pk) OR #owner = :owner",
    ExpressionAttributeNames: { "#pk": partitionKey, "#owner": ownerAttribute },
    ExpressionAttributeValues: { ":owner": ownerValue },
    ReturnValues: "ALL_OLD",
  }));
  const check = await client.send(new GetCommand({
    TableName: tableName, Key: key, ConsistentRead: true,
  }));
  assert.equal(check.Item, undefined, "Test record should be absent after cleanup");
  return result.Attributes !== undefined;
}

module.exports = { shouldDeleteTestData, clearTestRecord };
