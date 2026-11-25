// AI-assisted: see AI-ATTRIBUTION.md
// Add only bcryptjs to the existing layer; preserve all other layer dependencies.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const server = path.resolve(__dirname, "..");
const source = path.join(server, "node_modules", "bcryptjs");
const destination = path.join(server, "layer", "nodejs", "node_modules", "bcryptjs");
fs.cpSync(source, destination, { recursive: true });

function verify(directory, copied) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const from = path.join(directory, entry.name);
    const to = path.join(copied, entry.name);
    if (entry.isDirectory()) verify(from, to);
    else assert.deepEqual(fs.readFileSync(to), fs.readFileSync(from), `Layer bytes differ: ${entry.name}`);
  }
}
verify(source, destination);
const layerRequire = createRequire(path.join(server, "layer", "nodejs", "package.json"));
assert.ok(layerRequire.resolve("bcryptjs").startsWith(destination + path.sep));
const bcrypt = layerRequire("bcryptjs");
assert.ok(bcrypt.compareSync("layer-check", bcrypt.hashSync("layer-check", 4)));
console.log("bcryptjs copied to the existing layer, byte-verified, and loaded successfully");
