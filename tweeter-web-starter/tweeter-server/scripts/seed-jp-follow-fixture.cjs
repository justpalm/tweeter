// AI-assisted: see AI-ATTRIBUTION.md
// Creates @jp and 20 synthetic accounts with reciprocal follow relationships.
// No writes occur unless --execute is supplied.
// For execution, set JP_PASSWORD and the deployed AWS resource names used below.
// JP_FIXTURE_MANIFEST optionally overrides the private manifest path in the home directory.
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const API_BASE_URL = (process.env.TWEETER_API_BASE_URL?.trim() ||
  "https://we8tshfgt5.execute-api.us-east-2.amazonaws.com/prod").replace(/\/+$/, "");
const MANIFEST_PATH = process.env.JP_FIXTURE_MANIFEST ??
  path.join(os.homedir(), ".tweeter-jp-follow-fixture.json");
const IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/5ncLrgAAAABJRU5ErkJggg==";
const firstNames = ["Avery", "Blake", "Casey", "Drew", "Emery", "Finley", "Gray", "Harper", "Indigo", "Jordan"];
const lastNames = ["Adams", "Bennett", "Carter", "Diaz", "Ellis", "Foster", "Garcia", "Hayes", "Irwin", "Jones"];
const accounts = [
  { alias: "@jp", firstName: "jp", lastName: "jp" },
];
const runId = crypto.randomBytes(6).toString("hex");

for (let i = 1; i <= 20; i++) {
  accounts.push({
    alias: `@jp-fixture-${runId}-${String(i).padStart(2, "0")}`,
    firstName: firstNames[crypto.randomInt(firstNames.length)],
    lastName: lastNames[crypto.randomInt(lastNames.length)],
  });
}

const relationships = accounts.slice(1).flatMap(account => [
  { follower: "@jp", followee: account.alias },
  { follower: account.alias, followee: "@jp" },
]);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`${name} must be set to the deployed tweeter-server resource`);
  return value.trim();
}

function writeManifest(manifest) {
  const temporary = `${MANIFEST_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(manifest, null, 2), { flag: "wx" });
  fs.renameSync(temporary, MANIFEST_PATH);
}

async function pause(milliseconds = 1500) {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function apiPost(route, request) {
  await pause();
  const response = await fetch(`${API_BASE_URL}/lambda/${route}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30000),
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`${route} returned non-JSON HTTP ${response.status}`);
  }
  if (!response.ok || payload.success !== true) {
    throw new Error(`${route} failed (HTTP ${response.status}): ${payload.message ?? payload.error ?? "request rejected"}`);
  }
  return payload;
}

function loadResumeManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  if (manifest.schemaVersion !== 1 || !/^[0-9a-f]{12}$/.test(manifest.runId) ||
      !Array.isArray(manifest.accounts) || manifest.accounts.length !== 21 ||
      manifest.accounts[0]?.alias !== "@jp" || manifest.accounts[0]?.firstName !== "jp" ||
      manifest.accounts[0]?.lastName !== "jp") {
    throw new Error("Invalid resume manifest; refusing to continue");
  }
  for (const [index, account] of manifest.accounts.slice(1).entries()) {
    if (account.alias !== `@jp-fixture-${manifest.runId}-${String(index + 1).padStart(2, "0")}`) {
      throw new Error("Unexpected alias in resume manifest; refusing to continue");
    }
  }
  return manifest;
}

function fixtureRelationshipKey(follower, followee) {
  return `${follower}\u0000${followee}`;
}

async function resumeFixture(manifest, password, userTable) {
  const region = process.env.AWS_REGION?.trim() || "us-east-2";
  const expectedResources = {
    userTable,
    authTokenTable: requiredEnv("AUTH_TOKEN_TABLE_NAME"),
    followTable: requiredEnv("FOLLOW_TABLE_NAME"),
    storyTable: requiredEnv("STORY_TABLE_NAME"),
    feedTable: requiredEnv("FEED_TABLE_NAME"),
    imageBucket: requiredEnv("PROFILE_IMAGE_BUCKET_NAME"),
  };
  if (manifest.region !== region || manifest.apiBaseUrl !== API_BASE_URL ||
      Object.entries(expectedResources).some(([key, value]) => manifest[key] !== value)) {
    throw new Error("Resume target differs from the original fixture; refusing to continue");
  }

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  try {
    const aliases = new Set(manifest.accounts.map(account => account.alias));
    for (const account of manifest.accounts) {
      await pause();
      const result = await client.send(new GetCommand({
        TableName: userTable,
        Key: { alias: account.alias },
        ConsistentRead: true,
      }));
      const profile = result.Item;
      if (!profile || profile.fixtureId !== manifest.runId ||
          profile.firstName !== account.firstName || profile.lastName !== account.lastName ||
          profile.imageUrl !== account.imageUrl) {
        throw new Error(`Fixture ownership check failed for ${account.alias}; refusing to continue`);
      }
    }

    const allowed = new Set(manifest.accounts.slice(1).flatMap(account => [
      fixtureRelationshipKey("@jp", account.alias),
      fixtureRelationshipKey(account.alias, "@jp"),
    ]));
    const found = new Set();
    let ExclusiveStartKey;
    do {
      await pause();
      const page = await client.send(new ScanCommand({
        TableName: manifest.followTable,
        ConsistentRead: true,
        ProjectionExpression: "follower_handle, followee_handle",
        ExclusiveStartKey,
      }));
      for (const edge of page.Items ?? []) {
        if (!aliases.has(edge.follower_handle) && !aliases.has(edge.followee_handle)) continue;
        const key = fixtureRelationshipKey(edge.follower_handle, edge.followee_handle);
        if (!allowed.has(key)) throw new Error("Unexpected fixture relationship; refusing to continue");
        found.add(key);
      }
      ExclusiveStartKey = page.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    for (const account of manifest.accounts.slice(1)) {
      if (!found.has(fixtureRelationshipKey(account.alias, "@jp"))) {
        throw new Error(`Expected follower relationship is missing for ${account.alias}; refusing to continue`);
      }
    }

    const loggedIn = await apiPost("login", { alias: "@jp", password });
    if (loggedIn.user?.alias !== "@jp" || typeof loggedIn.token !== "string" || !loggedIn.token) {
      throw new Error("Login returned an unexpected @jp session");
    }
    try {
      for (const account of manifest.accounts.slice(1)) {
        if (!found.has(fixtureRelationshipKey("@jp", account.alias))) {
          await apiPost("follow", { token: loggedIn.token, userAlias: account.alias });
        }
      }
    } finally {
      await apiPost("logout", { token: loggedIn.token });
    }
    console.log("Resumed the existing fixture; @jp now follows all 20 synthetic accounts.");
    console.log(`Fixture manifest: ${MANIFEST_PATH}`);
  } finally {
    client.destroy();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  const allowWeakPassword = args.includes("--allow-weak-password");
  const resume = args.includes("--resume");
  if (args.some(argument => !["--execute", "--allow-weak-password", "--resume"].includes(argument))) {
    throw new Error("Usage: node scripts/seed-jp-follow-fixture.cjs [--execute] [--resume] [--allow-weak-password]");
  }
  if (resume) {
    const manifest = loadResumeManifest();
    if (!execute) {
      console.log("Dry run: no AWS or API requests were made.");
      console.log(`Would resume @jp fixture ${manifest.runId} without recreating accounts.`);
      console.log(`Manifest: ${MANIFEST_PATH}`);
      return;
    }
    const password = process.env.JP_PASSWORD;
    if (!password) throw new Error("JP_PASSWORD must be set; it is not saved in the manifest.");
    if (Buffer.byteLength(password, "utf8") < 12 && !allowWeakPassword) {
      throw new Error("JP_PASSWORD must be at least 12 UTF-8 bytes unless --allow-weak-password is supplied.");
    }
    if (Buffer.byteLength(password, "utf8") > 72) {
      throw new Error("JP_PASSWORD must not exceed 72 UTF-8 bytes.");
    }
    if (Buffer.byteLength(password, "utf8") < 12) {
      console.warn("Warning: the explicitly approved JP_PASSWORD is weak; anyone who guesses it may access @jp.");
    }
    await resumeFixture(manifest, password, requiredEnv("USER_TABLE_NAME"));
    return;
  }
  if (!execute) {
    console.log("Dry run: no AWS or API requests were made.");
    console.log(`Would register ${accounts.length} users (@jp plus ${accounts.length - 1} synthetic accounts).`);
    console.log(`Would create ${relationships.length} follows: 20 followers and 20 followees for @jp.`);
    console.log(`Live API: ${API_BASE_URL}`);
    console.log(`Manifest: ${MANIFEST_PATH}`);
    console.log("Pass --execute to perform these changes.");
    return;
  }

  const region = process.env.AWS_REGION?.trim() || "us-east-2";
  const userTable = requiredEnv("USER_TABLE_NAME");
  const password = process.env.JP_PASSWORD;
  if (!password) throw new Error("JP_PASSWORD must be set; it is not saved in the manifest.");
  if (Buffer.byteLength(password, "utf8") < 12 && !allowWeakPassword) {
    throw new Error("JP_PASSWORD must be at least 12 UTF-8 bytes unless --allow-weak-password is supplied.");
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("JP_PASSWORD must not exceed 72 UTF-8 bytes; it is not saved in the manifest.");
  }
  if (Buffer.byteLength(password, "utf8") < 12) {
    console.warn("Warning: the explicitly approved JP_PASSWORD is weak; anyone who guesses it may access @jp.");
  }
  const manifest = {
    schemaVersion: 1,
    runId,
    createdAt: new Date().toISOString(),
    region,
    apiBaseUrl: API_BASE_URL,
    userTable,
    authTokenTable: requiredEnv("AUTH_TOKEN_TABLE_NAME"),
    followTable: requiredEnv("FOLLOW_TABLE_NAME"),
    storyTable: requiredEnv("STORY_TABLE_NAME"),
    feedTable: requiredEnv("FEED_TABLE_NAME"),
    imageBucket: requiredEnv("PROFILE_IMAGE_BUCKET_NAME"),
    accounts,
  };
  if (fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest already exists; clean up or move it first: ${MANIFEST_PATH}`);
  }
  const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  try {
    for (const account of accounts) {
      await pause();
      const result = await documentClient.send(new GetCommand({
        TableName: userTable,
        Key: { alias: account.alias },
        ConsistentRead: true,
        ProjectionExpression: "#alias",
        ExpressionAttributeNames: { "#alias": "alias" },
      }));
      if (result.Item) throw new Error(`Refusing to overwrite existing account ${account.alias}`);
    }

    writeManifest(manifest);
    const tokens = new Map();
    for (const account of accounts) {
      const registered = await apiPost("register", {
        firstName: account.firstName,
        lastName: account.lastName,
        alias: account.alias,
        password: account.alias === "@jp" ? password : crypto.randomBytes(32).toString("hex"),
        imageStringBase64: IMAGE_BASE64,
        imageFileExtension: "png",
      });
      if (registered.user?.alias !== account.alias ||
          registered.user?.firstName !== account.firstName ||
          registered.user?.lastName !== account.lastName ||
          typeof registered.user?.imageUrl !== "string" ||
          typeof registered.token !== "string" || !registered.token) {
        throw new Error(`Registration returned an unexpected profile for ${account.alias}`);
      }

      await pause();
      await documentClient.send(new UpdateCommand({
        TableName: userTable,
        Key: { alias: account.alias },
        UpdateExpression: "SET fixtureId = :runId",
        ConditionExpression: "firstName = :first AND lastName = :last AND imageUrl = :image AND attribute_not_exists(fixtureId)",
        ExpressionAttributeValues: {
          ":runId": runId,
          ":first": account.firstName,
          ":last": account.lastName,
          ":image": registered.user.imageUrl,
        },
      }));
      account.imageUrl = registered.user.imageUrl;
      writeManifest(manifest);
      tokens.set(account.alias, registered.token);

      if (account.alias !== "@jp") {
        await apiPost("follow", { token: registered.token, userAlias: "@jp" });
        await apiPost("logout", { token: registered.token });
        tokens.delete(account.alias);
      }
    }

    const jpSession = await apiPost("login", { alias: "@jp", password });
    if (jpSession.user?.alias !== "@jp" || typeof jpSession.token !== "string" || !jpSession.token) {
      throw new Error("Login returned an unexpected @jp session");
    }
    const jpToken = jpSession.token;
    for (const account of accounts.slice(1)) {
      await apiPost("follow", { token: jpToken, userAlias: account.alias });
    }
    await apiPost("logout", { token: jpToken });
    tokens.delete("@jp");

    console.log(`Created @jp and ${accounts.length - 1} synthetic accounts.`);
    console.log("Result: @jp has 20 followers and follows 20 accounts; all 20 relationships are reciprocal.");
    console.log(`JP_PASSWORD was not written to disk. Set the same value to log in as @jp.`);
    console.log(`Cleanup manifest: ${MANIFEST_PATH}`);
  } finally {
    documentClient.destroy();
  }
}

main().catch(error => {
  console.error(`Fixture seeding stopped: ${error.message}`);
  console.error(`If any accounts were created, use the cleanup script with manifest: ${MANIFEST_PATH}`);
  process.exitCode = 1;
});
