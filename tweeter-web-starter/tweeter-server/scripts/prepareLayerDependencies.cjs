// AI-assisted: see AI-ATTRIBUTION.md
// Copy installed production dependencies (including S3 transitives) from the
// server lockfile. Run shared compile and server build before this command.
// Preserve other existing layer files; this command does not deploy anything.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const server = path.resolve(__dirname, "..");
const layer = path.join(server, "layer", "nodejs");
const lock = JSON.parse(fs.readFileSync(path.join(server, "package-lock.json"), "utf8"));

function copyVerified(source, target) {
  fs.cpSync(source, target, { recursive: true, dereference: true });
  function verify(from, to) {
    if (fs.statSync(from).isDirectory()) {
      for (const name of fs.readdirSync(from)) verify(path.join(from, name), path.join(to, name));
    } else assert.deepEqual(fs.readFileSync(to), fs.readFileSync(from), `Layer bytes differ: ${to}`);
  }
  verify(source, target);
}

let copied = 0;
for (const [relative, metadata] of Object.entries(lock.packages)) {
  if (!relative.startsWith("node_modules/") || metadata.dev) continue;
  const source = path.join(server, relative);
  const target = path.join(layer, relative);
  if (relative === "node_modules/tweeter-shared") {
    // The local package is a link; package only its runtime output and manifest.
    copyVerified(path.join(source, "dist"), path.join(target, "dist"));
    copyVerified(path.join(source, "package.json"), path.join(target, "package.json"));
  } else {
    assert.ok(!metadata.link, `Unsupported linked dependency: ${relative}`);
    copyVerified(source, target);
  }
  copied++;
}
const layerRequire = createRequire(path.join(layer, "package.json"));
for (const name of ["@aws-sdk/client-s3", "@aws-sdk/client-dynamodb", "@aws-sdk/lib-dynamodb", "bcryptjs", "tweeter-shared"]) {
  assert.ok(layerRequire.resolve(name).startsWith(path.join(layer, "node_modules") + path.sep));
  layerRequire(name);
}
console.log(`${copied} production packages copied and byte-verified; S3, DynamoDB, bcryptjs, and shared loaded from layer`);
