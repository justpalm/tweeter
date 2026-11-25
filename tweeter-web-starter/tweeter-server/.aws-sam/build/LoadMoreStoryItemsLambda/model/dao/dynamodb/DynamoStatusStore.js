"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoStatusStore = exports.statusClient = void 0;
exports.statusKey = statusKey;
exports.statusItem = statusItem;
// AI-assisted: see AI-ATTRIBUTION.md
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const node_crypto_1 = require("node:crypto");
exports.statusClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({}));
/** IEEE-754 big-endian bytes preserve order for finite nonnegative numbers,
 * including zero/fractions accepted by existing cursors. Author breaks feed ties.
 * Author timestamps are made unique by conditional story creation.
 */
function statusKey(cursor) {
    if (!Number.isFinite(cursor.timestamp) || cursor.timestamp < 0) {
        throw new Error("bad-request: Invalid status timestamp");
    }
    const time = Buffer.alloc(8);
    time.writeDoubleBE(cursor.timestamp === 0 ? 0 : cursor.timestamp);
    const author = (0, node_crypto_1.createHash)("sha256").update(cursor.authorAlias).digest("hex");
    return `${time.toString("hex")}#${author}`;
}
function statusItem(ownerAlias, status) {
    return { owner_alias: ownerAlias,
        status_key: statusKey({ authorAlias: status.user.alias, timestamp: status.timestamp }), status };
}
/** Shared storage mechanics, separate from the database-independent DAO contracts. */
class DynamoStatusStore {
    tableName;
    client;
    constructor(tableName, client = exports.statusClient) {
        this.tableName = tableName;
        this.client = client;
        if (!tableName.trim())
            throw new Error("Status table name is required");
    }
    async getPage(ownerAlias, pageSize, after) {
        if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
            throw new Error("bad-request: Page size must be an integer from 1 to 100");
        }
        const items = [];
        let startKey;
        do {
            const result = await this.client.send(new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName, ConsistentRead: true, ScanIndexForward: false,
                KeyConditionExpression: "owner_alias = :owner" + (after === null ? "" : " AND status_key < :after"),
                ExpressionAttributeValues: { ":owner": ownerAlias, ...(after === null ? {} : { ":after": statusKey(after) }) },
                ProjectionExpression: "#status", ExpressionAttributeNames: { "#status": "status" },
                Limit: pageSize + 1 - items.length, ExclusiveStartKey: startKey,
            }));
            for (const item of result.Items ?? []) {
                const status = item.status;
                if (!status || typeof status.post !== "string" || !status.user ||
                    typeof status.user.alias !== "string" || typeof status.user.firstName !== "string" ||
                    typeof status.user.lastName !== "string" || typeof status.user.imageUrl !== "string" ||
                    !Number.isFinite(status.timestamp) || status.timestamp < 0) {
                    throw new Error("internal-server-error: Invalid stored status");
                }
                items.push(status);
            }
            startKey = result.LastEvaluatedKey;
        } while (startKey && items.length <= pageSize);
        return { items: items.slice(0, pageSize), hasMore: items.length > pageSize };
    }
}
exports.DynamoStatusStore = DynamoStatusStore;
