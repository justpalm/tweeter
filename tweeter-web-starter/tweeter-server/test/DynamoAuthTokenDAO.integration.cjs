// AI-assisted: see AI-ATTRIBUTION.md
// Direct live DynamoDB test; requires GetItem/PutItem/UpdateItem/DeleteItem.
// PowerShell, from tweeter-server:
// $env:AUTH_TOKEN_TABLE_NAME = "tweeter-server-AuthTokenTable-1SYRKWUL78X2E"
// $env:AWS_REGION = "us-east-2"
// $env:DELETE_TEST_DATA = "true" # Use "false" to retain the fixture.
// npm run test:integration:auth-token-dao
// DELETE_TEST_DATA defaults true; false retains this suite's fixture for inspection.
const assert = require("node:assert/strict");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { DynamoAuthTokenDAO } = require("../dist/model/dao/dynamodb/DynamoAuthTokenDAO.js");
const { shouldDeleteTestData, clearTestRecord } = require("./helpers/liveTestData.cjs");

async function testAuthTokenDAO() {
  const tableName = process.env.AUTH_TOKEN_TABLE_NAME;
  const region = process.env.AWS_REGION;
  assert.ok(tableName && /^[A-Za-z0-9_.-]{3,255}$/.test(tableName),
    "Set AUTH_TOKEN_TABLE_NAME to the actual deployed table name (not a placeholder)");
  assert.ok(region?.trim(), "Set AWS_REGION to the table's AWS region");
  const deleteTestData = shouldDeleteTestData();
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  const dao = new DynamoAuthTokenDAO(tableName, client);
  const record = {
    token: "integration-auth-token-dao-not-a-real-session",
    userAlias: "@integration-auth-token-dao",
    lastActiveTimestamp: 1000,
  };
  const fixture = {
    tableName, key: { token: record.token }, ownerAttribute: "userAlias", ownerValue: record.userAlias,
  };
  let prepared = false;
  try {
    if (await clearTestRecord(client, fixture)) console.log("RESET: removed retained token fixture");
    prepared = true;
    assert.equal(await dao.getAuthToken(record.token), null);
    assert.equal(await dao.updateLastActiveTimestamp(record.token, 2000), false);
    assert.equal(await dao.getAuthToken(record.token), null);
    await dao.deleteAuthToken(record.token);
    console.log("PASS: missing reads/updates/deletes; update does not create a session");

    assert.equal(await dao.createAuthToken(record), true);
    assert.deepEqual(await dao.getAuthToken(record.token), record);
    assert.equal(await dao.createAuthToken({ ...record, userAlias: "@overwrite", lastActiveTimestamp: 9999 }), false);
    assert.deepEqual(await dao.getAuthToken(record.token), record);
    console.log("PASS: creation/read and duplicate protection preserve owner and activity");

    assert.equal(await dao.updateLastActiveTimestamp(record.token, 3000), true);
    assert.equal(await dao.updateLastActiveTimestamp(record.token, 3000), true);
    assert.equal(await dao.updateLastActiveTimestamp(record.token, 2000), true);
    assert.deepEqual(await dao.getAuthToken(record.token), { ...record, lastActiveTimestamp: 3000 });
    // Concurrent requests use distinct times; final state must be the maximum.
    assert.deepEqual(await Promise.all([5000, 4000].map(time =>
      dao.updateLastActiveTimestamp(record.token, time))), [true, true]);
    assert.deepEqual(await dao.getAuthToken(record.token), { ...record, lastActiveTimestamp: 5000 });
    console.log("PASS: later/equal/older and concurrent activity retain maximum timestamp");

    await dao.deleteAuthToken(record.token);
    assert.equal(await dao.updateLastActiveTimestamp(record.token, 6000), false);
    assert.equal(await dao.getAuthToken(record.token), null);
    // Exercise a delete/update race: either operation may win, but the session
    // must be absent after both finish. The update must never resurrect it.
    assert.equal(await dao.createAuthToken(record), true);
    const [, updated] = await Promise.all([
      dao.deleteAuthToken(record.token), dao.updateLastActiveTimestamp(record.token, 7000),
    ]);
    assert.equal(typeof updated, "boolean");
    assert.equal(await dao.getAuthToken(record.token), null);
    await dao.deleteAuthToken(record.token);
    console.log("PASS: logout and delete/update race leave no session; repeated delete succeeds");

    // Leave a known, owned fixture for optional keep mode. These ancient times
    // deliberately test storage; this is not an authenticated feature session.
    assert.equal(await dao.createAuthToken(record), true);
  } finally {
    try {
      if (prepared && deleteTestData) {
        await clearTestRecord(client, fixture);
        console.log("PASS: fixture deleted and absence verified");
      } else if (prepared) {
        console.log(`KEPT: inspect token ${record.token} in table ${tableName}`);
      }
    } catch (error) {
      console.error(`Cleanup failed for token fixture in ${tableName}`);
      throw error;
    } finally {
      client.destroy();
    }
  }
}

testAuthTokenDAO().catch(error => { console.error(error); process.exitCode = 1; });
