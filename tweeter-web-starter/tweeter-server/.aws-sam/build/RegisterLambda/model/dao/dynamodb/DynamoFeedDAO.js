"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoFeedDAO = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const DynamoStatusStore_1 = require("./DynamoStatusStore");
class DynamoFeedDAO extends DynamoStatusStore_1.DynamoStatusStore {
    async addToFeeds(recipientAliases, status) {
        const aliases = [...new Set(recipientAliases)];
        for (let offset = 0; offset < aliases.length; offset += 25) {
            let pending = aliases.slice(offset, offset + 25).map(alias => ({ PutRequest: { Item: (0, DynamoStatusStore_1.statusItem)(alias, status) } }));
            for (let attempt = 0; pending.length; attempt++) {
                const result = await this.client.send(new lib_dynamodb_1.BatchWriteCommand({ RequestItems: { [this.tableName]: pending } }));
                const remaining = result.UnprocessedItems?.[this.tableName] ?? [];
                if (!remaining.length)
                    break;
                if (attempt >= 6)
                    throw new Error("internal-server-error: Feed delivery incomplete; some writes remain");
                // Retry only the unprocessed subset with bounded exponential backoff/jitter.
                pending = remaining;
                await new Promise(resolve => setTimeout(resolve, Math.min(100 * 2 ** attempt, 1600) + Math.random() * 100));
            }
        }
    }
    getFeed(ownerAlias, pageSize, after) {
        return this.getPage(ownerAlias, pageSize, after);
    }
}
exports.DynamoFeedDAO = DynamoFeedDAO;
