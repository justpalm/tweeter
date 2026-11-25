// AI-assisted: see AI-ATTRIBUTION.md
// Opt-in live test: USER_TABLE_NAME, FOLLOW_TABLE_NAME, FOLLOW_INDEX_NAME, AWS_REGION.
// Requires item reads/writes and transactional writes on both tables, plus GSI Query.
// Run sequentially. DELETE_TEST_DATA=false retains these reserved fixtures for inspection.
const assert = require("node:assert/strict");
const { setTimeout: delay } = require("node:timers/promises");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { DynamoFollowDAO } = require("../dist/model/dao/dynamodb/DynamoFollowDAO.js");
const { shouldDeleteTestData, clearTestRecord } = require("./helpers/liveTestData.cjs");

async function main() {
  const { USER_TABLE_NAME: users, FOLLOW_TABLE_NAME: follows, FOLLOW_INDEX_NAME: index, AWS_REGION: region } = process.env;
  assert.ok([users, follows, index, region].every(x => x?.trim()), "Set all four table/index/region variables");
  const cleanup = shouldDeleteTestData();
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  const dao = new DynamoFollowDAO(follows, users, index, client);
  const [a, b, c] = ["a", "b", "c"].map(x => `@integration-follow-dao-${x}`);
  const owner = "follow-dao-fixture-not-a-password";
  const edges = [[a, b], [a, c], [c, b]];
  const zero = { followerCount: 0, followeeCount: 0 };
  let prepared = false;
  async function clear() {
    // Verify ownership of all fixture accounts before deleting any related data.
    for (const alias of [a, b, c]) {
      const { Item } = await client.send(new GetCommand({ TableName: users, Key: { alias }, ConsistentRead: true }));
      assert.ok(!Item || Item.passwordHash === owner, `Unowned fixture alias: ${alias}`);
    }
    for (const [follower_handle, followee_handle] of edges) {
      await clearTestRecord(client, { tableName: follows, key: { follower_handle, followee_handle },
        ownerAttribute: "follower_handle", ownerValue: follower_handle });
    }
    for (const alias of [a, b, c]) {
      await clearTestRecord(client, { tableName: users, key: { alias }, ownerAttribute: "passwordHash", ownerValue: owner });
    }
  }
  try {
    await clear();
    prepared = true;
    assert.equal(await dao.getCounts(a), null);
    for (const alias of [a, b, c]) await client.send(new PutCommand({ TableName: users,
      Item: { alias, firstName: "Follow", lastName: "Fixture", imageUrl: "https://example.com/test.png", passwordHash: owner },
      ConditionExpression: "attribute_not_exists(alias)" }));
    assert.deepEqual(await dao.getCounts(a), zero);
    assert.equal(await dao.isFollowing(a, b), false);
    for (const [from, to] of edges) assert.equal(await dao.follow(from, to), true);
    assert.equal(await dao.follow(a, b), false);
    assert.deepEqual(await dao.getCounts(a), { followerCount: 0, followeeCount: 2 });
    assert.deepEqual(await dao.getCounts(b), { followerCount: 2, followeeCount: 0 });
    assert.equal(await dao.isFollowing(a, b), true);
    assert.deepEqual(await dao.getFollowees(a, 1, null), { aliases: [b], hasMore: true });
    assert.deepEqual(await dao.getFollowees(a, 1, b), { aliases: [c], hasMore: false });
    // The reverse GSI is eventually consistent; bounded polling checks actual convergence.
    for (let attempt = 0; ; attempt++) {
      const page = await dao.getFollowers(b, 10, null);
      if (page.aliases.join() === [a, c].join()) break;
      assert.ok(attempt < 39, "Follower index did not converge within 10 seconds");
      await delay(250);
    }
    assert.deepEqual(await dao.getFollowers(b, 1, null), { aliases: [a], hasMore: true });
    assert.deepEqual(await dao.getFollowers(b, 1, a), { aliases: [c], hasMore: false });
    for (const [from, to] of edges) assert.equal(await dao.unfollow(from, to), true);
    assert.equal(await dao.unfollow(a, b), false);
    for (const alias of [a, b, c]) assert.deepEqual(await dao.getCounts(alias), zero);
    await assert.rejects(dao.follow(a, a), /yourself/);
    await clearTestRecord(client, { tableName: users, key: { alias: c }, ownerAttribute: "passwordHash", ownerValue: owner });
    await assert.rejects(dao.follow(a, c));
    assert.equal(await dao.isFollowing(a, c), false);
    assert.deepEqual(await dao.getCounts(a), zero);
    if (!cleanup) assert.equal(await dao.follow(a, b), true);
    console.log("PASS: edges, duplicate protection, counters, both paginated directions, and missing-user rollback");
  } finally {
    try {
      if (prepared && cleanup) { await clear(); console.log("CLEANED: fixture edges/users; absence verified"); }
      else if (prepared) console.log(`KEPT: ${a}, ${b}; relationship ${a} -> ${b}`);
    } finally { client.destroy(); }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
