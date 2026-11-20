// AI-assisted: see AI-ATTRIBUTION.md
// Validate JSON at the Lambda boundary; session and business rules belong elsewhere.
function requireObject(
  value: unknown,
  name: string,
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`bad-request: ${name} must be an object`);
  }
}

export function requireStrings(
  value: unknown,
  fields: readonly string[],
  name = "request",
): asserts value is Record<string, unknown> {
  requireObject(value, name);
  for (const field of fields) {
    const fieldValue = value[field];
    if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
      throw new Error(`bad-request: ${name}.${field} must be a nonblank string`);
    }
  }
}

function requireUser(value: unknown, name: string): void {
  requireStrings(value, ["firstName", "lastName", "alias", "imageUrl"], name);
}

function requireStatus(value: unknown, name: string): void {
  requireStrings(value, ["post"], name);
  requireUser(value.user, `${name}.user`);
  if (typeof value.timestamp !== "number" ||
      !Number.isFinite(value.timestamp) || value.timestamp < 0) {
    throw new Error(`bad-request: ${name}.timestamp must be a finite nonnegative number`);
  }
}

export function validatePageRequest(request: unknown, itemType: "user" | "status"): void {
  requireStrings(request, ["token", "userAlias"]);
  if (typeof request.pageSize !== "number" ||
      !Number.isInteger(request.pageSize) || request.pageSize <= 0) {
    throw new Error("bad-request: request.pageSize must be a positive integer");
  }
  // Only explicit null denotes the first page; missing/malformed cursors are invalid.
  if (request.lastItem !== null) {
    if (itemType === "user") {
      requireUser(request.lastItem, "request.lastItem");
    } else {
      requireStatus(request.lastItem, "request.lastItem");
    }
  }
}

export function validatePostStatusRequest(request: unknown): void {
  requireStrings(request, ["token"]);
  requireStatus(request.newStatus, "request.newStatus");
}
