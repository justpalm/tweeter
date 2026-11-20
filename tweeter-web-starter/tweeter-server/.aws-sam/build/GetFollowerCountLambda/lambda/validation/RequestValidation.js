"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStrings = requireStrings;
exports.validatePageRequest = validatePageRequest;
exports.validatePostStatusRequest = validatePostStatusRequest;
// AI-assisted: see AI-ATTRIBUTION.md
// Validate JSON at the Lambda boundary; session and business rules belong elsewhere.
function requireObject(value, name) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`bad-request: ${name} must be an object`);
    }
}
function requireStrings(value, fields, name = "request") {
    requireObject(value, name);
    for (const field of fields) {
        const fieldValue = value[field];
        if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
            throw new Error(`bad-request: ${name}.${field} must be a nonblank string`);
        }
    }
}
function requireUser(value, name) {
    requireStrings(value, ["firstName", "lastName", "alias", "imageUrl"], name);
}
function requireStatus(value, name) {
    requireStrings(value, ["post"], name);
    requireUser(value.user, `${name}.user`);
    if (typeof value.timestamp !== "number" ||
        !Number.isFinite(value.timestamp) || value.timestamp < 0) {
        throw new Error(`bad-request: ${name}.timestamp must be a finite nonnegative number`);
    }
}
function validatePageRequest(request, itemType) {
    requireStrings(request, ["token", "userAlias"]);
    if (typeof request.pageSize !== "number" ||
        !Number.isInteger(request.pageSize) || request.pageSize <= 0) {
        throw new Error("bad-request: request.pageSize must be a positive integer");
    }
    // Only explicit null denotes the first page; missing/malformed cursors are invalid.
    if (request.lastItem !== null) {
        if (itemType === "user") {
            requireUser(request.lastItem, "request.lastItem");
        }
        else {
            requireStatus(request.lastItem, "request.lastItem");
        }
    }
}
function validatePostStatusRequest(request) {
    requireStrings(request, ["token"]);
    requireStatus(request.newStatus, "request.newStatus");
}
