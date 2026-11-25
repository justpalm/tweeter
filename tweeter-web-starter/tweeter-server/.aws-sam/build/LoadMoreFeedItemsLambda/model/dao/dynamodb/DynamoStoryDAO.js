"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoStoryDAO = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const DynamoStatusStore_1 = require("./DynamoStatusStore");
class DynamoStoryDAO extends DynamoStatusStore_1.DynamoStatusStore {
    async createStatus(status) {
        try {
            await this.client.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName, Item: (0, DynamoStatusStore_1.statusItem)(status.user.alias, status),
                ConditionExpression: "attribute_not_exists(owner_alias)",
            }));
            return true;
        }
        catch (error) {
            if (error instanceof client_dynamodb_1.ConditionalCheckFailedException)
                return false;
            throw error;
        }
    }
    getStory(authorAlias, pageSize, after) {
        return this.getPage(authorAlias, pageSize, after);
    }
}
exports.DynamoStoryDAO = DynamoStoryDAO;
