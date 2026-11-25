// AI-assisted: see AI-ATTRIBUTION.md
// Removes only the fixture recorded by seed-jp-follow-fixture.cjs.
// No writes occur unless --execute is supplied.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { DeleteObjectCommand, S3Client } = require("@aws-sdk/client-s3");

const MANIFEST_PATH = process.env.JP_FIXTURE_MANIFEST ??
  path.join(os.homedir(), ".tweeter-jp-follow-fixture.json");

async function pause() {
  await new Promise(resolve => setTimeout(resolve, 1500));
}

function readManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  if (manifest.schemaVersion !== 1 || !/^[0-9a-f]{12}$/.test(manifest.runId) ||
      !Array.isArray(manifest.accounts) || manifest.accounts.length !== 21 ||
      manifest.accounts[0]?.alias !== "@jp" ||
      manifest.accounts[0]?.firstName !== "jp" || manifest.accounts[0]?.lastName !== "jp") {
    throw new Error("Invalid fixture manifest; refusing cleanup");
  }
  for (const [index, account] of manifest.accounts.slice(1).entries()) {
    if (account.alias !== `@jp-fixture-${manifest.runId}-${String(index + 1).padStart(2, "0")}` ||
        typeof account.firstName !== "string" || typeof account.lastName !== "string") {
      throw new Error("Manifest contains an unexpected account; refusing cleanup");
    }
  }
  for (const key of ["region", "userTable", "authTokenTable", "followTable", "storyTable", "feedTable", "imageBucket"]) {
    if (typeof manifest[key] !== "string" || !manifest[key].trim()) {
      throw new Error(`Manifest is missing ${key}; refusing cleanup`);
    }
  }
  return manifest;
}

function expectedRelationships(accounts) {
  return new Set(accounts.slice(1).flatMap(account => [
    `@jp\u0000${account.alias}`,
    `${account.alias}\u0000@jp`,
  ]));
}

function imageKey(imageUrl, bucket, region) {
  let url;
  try {
    url = new URL(imageUrl);
  } catch {
    throw new Error("Fixture profile contains an invalid image URL; refusing cleanup");
  }
  if (url.protocol !== "https:" || url.host !== `${bucket}.s3.${region}.amazonaws.com` ||
      url.search || url.hash || !/^\/profile-images\/[0-9a-f]{64}\.png$/.test(url.pathname)) {
    throw new Error("Fixture profile image is outside the expected bucket/key; refusing cleanup");
  }
  return url.pathname.slice(1);
}

async function scanAll(client, input) {
  const items = [];
  let ExclusiveStartKey;
  do {
    await pause();
    const page = await client.send(new ScanCommand({ ...input, ExclusiveStartKey }));
    items.push(...(page.Items ?? []));
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function deleteStatusPartition(client, tableName, alias) {
  let ExclusiveStartKey;
  do {
    await pause();
    const page = await client.send(new QueryCommand({
      TableName: tableName,
      ConsistentRead: true,
      KeyConditionExpression: "owner_alias = :owner",
      ExpressionAttributeValues: { ":owner": alias },
      ProjectionExpression: "owner_alias, status_key",
      ExclusiveStartKey,
    }));
    for (const item of page.Items ?? []) {
      if (item.owner_alias !== alias || typeof item.status_key !== "string") {
        throw new Error(`Unexpected status key in ${tableName}; refusing cleanup`);
      }
      await pause();
      await client.send(new DeleteCommand({
        TableName: tableName,
        Key: { owner_alias: alias, status_key: item.status_key },
        ConditionExpression: "attribute_exists(owner_alias)",
      }));
    }
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(argument => argument !== "--execute")) {
    throw new Error("Usage: node scripts/cleanup-jp-follow-fixture.cjs [--execute]");
  }
  if (!fs.existsSync(MANIFEST_PATH) && !args.includes("--execute")) {
    console.log("No fixture manifest found; nothing to clean. No AWS requests were made.");
    return;
  }
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Fixture manifest not found: ${MANIFEST_PATH}`);
  }
  const manifest = readManifest();
  const aliases = manifest.accounts.map(account => account.alias);
  if (!args.includes("--execute")) {
    console.log("Dry run: no AWS requests were made.");
    console.log(`Would remove ${aliases.length} fixture accounts, their sessions/images/status partitions, and 40 fixture follows.`);
    console.log(`Manifest: ${MANIFEST_PATH}`);
    console.log("Pass --execute to perform this cleanup.");
    return;
  }

  const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: manifest.region }));
  const s3 = new S3Client({ region: manifest.region });
  try {
    const profiles = new Map();
    for (const account of manifest.accounts) {
      await pause();
      const result = await dynamo.send(new GetCommand({
        TableName: manifest.userTable,
        Key: { alias: account.alias },
        ConsistentRead: true,
      }));
      const profile = result.Item;
      if (!profile) continue;
      if (profile.fixtureId !== manifest.runId || profile.firstName !== account.firstName ||
          profile.lastName !== account.lastName || typeof profile.imageUrl !== "string" ||
          (account.imageUrl && account.imageUrl !== profile.imageUrl)) {
        throw new Error(`Ownership check failed for ${account.alias}; no cleanup was performed`);
      }
      imageKey(profile.imageUrl, manifest.imageBucket, manifest.region);
      profiles.set(account.alias, profile);
    }

    const allowedRelationships = expectedRelationships(manifest.accounts);
    const relationships = await scanAll(dynamo, {
      TableName: manifest.followTable,
      ConsistentRead: true,
      ProjectionExpression: "follower_handle, followee_handle",
    });
    const fixtureRelationships = relationships.filter(item =>
      aliases.includes(item.follower_handle) || aliases.includes(item.followee_handle));
    for (const relationship of fixtureRelationships) {
      const key = `${relationship.follower_handle}\u0000${relationship.followee_handle}`;
      if (!allowedRelationships.has(key)) {
        throw new Error(`Unexpected relationship involving a fixture account (${relationship.follower_handle} -> ${relationship.followee_handle}); no cleanup was performed`);
      }
    }
    for (const relationship of fixtureRelationships) {
      await pause();
      await dynamo.send(new DeleteCommand({
        TableName: manifest.followTable,
        Key: {
          follower_handle: relationship.follower_handle,
          followee_handle: relationship.followee_handle,
        },
        ConditionExpression: "attribute_exists(follower_handle)",
      }));
    }

    const sessions = await scanAll(dynamo, {
      TableName: manifest.authTokenTable,
      ConsistentRead: true,
      ProjectionExpression: "#token, userAlias",
      ExpressionAttributeNames: { "#token": "token" },
    });
    for (const session of sessions) {
      if (aliases.includes(session.userAlias) && typeof session.token === "string") {
        await pause();
        await dynamo.send(new DeleteCommand({
          TableName: manifest.authTokenTable,
          Key: { token: session.token },
          ConditionExpression: "userAlias = :alias",
          ExpressionAttributeValues: { ":alias": session.userAlias },
        }));
      }
    }

    for (const alias of aliases) {
      await deleteStatusPartition(dynamo, manifest.storyTable, alias);
      await deleteStatusPartition(dynamo, manifest.feedTable, alias);
    }
    for (const [alias, profile] of profiles) {
      await s3.send(new DeleteObjectCommand({
        Bucket: manifest.imageBucket,
        Key: imageKey(profile.imageUrl, manifest.imageBucket, manifest.region),
      }));
    }
    for (const account of manifest.accounts) {
      if (!profiles.has(account.alias)) continue;
      await pause();
      await dynamo.send(new DeleteCommand({
        TableName: manifest.userTable,
        Key: { alias: account.alias },
        ConditionExpression: "fixtureId = :runId AND firstName = :first AND lastName = :last AND imageUrl = :image",
        ExpressionAttributeValues: {
          ":runId": manifest.runId,
          ":first": account.firstName,
          ":last": account.lastName,
          ":image": profiles.get(account.alias).imageUrl,
        },
      }));
    }
    fs.unlinkSync(MANIFEST_PATH);
    console.log(`Removed the @jp fixture, ${aliases.length - 1} synthetic accounts, and associated data.`);
  } finally {
    dynamo.destroy();
    s3.destroy();
  }
}

main().catch(error => {
  console.error(`Fixture cleanup stopped: ${error.message}`);
  console.error(`Manifest retained for review/retry: ${MANIFEST_PATH}`);
  process.exitCode = 1;
});
