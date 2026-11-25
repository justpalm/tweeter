"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoAuthTokenDAO = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
// Reuse the client; AWS supplies region and credentials through its standard chain.
const documentClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({}));
function isTimestamp(value) {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
/** Expects a string partition key named token, with no sort key. */
class DynamoAuthTokenDAO {
    tableName;
    client;
    constructor(tableName, client = documentClient) {
        this.tableName = tableName;
        this.client = client;
        if (!tableName.trim())
            throw new Error("Auth token table name is required");
    }
    async createAuthToken(record) {
        if (!record.token?.trim() || !record.userAlias?.trim() || !isTimestamp(record.lastActiveTimestamp)) {
            throw new Error("Invalid auth token record");
        }
        try {
            await this.client.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: {
                    token: record.token,
                    userAlias: record.userAlias,
                    lastActiveTimestamp: record.lastActiveTimestamp,
                },
                //
                //
                //attribute_not_exists prevents overwriting an existing token. 
                // If the token already exists, the PutCommand will throw a ConditionalCheckFailedException, 
                // which we catch and return false to indicate that the token was not created.
                //The attribute_not_exists is actually just a function in dynamo
                ConditionExpression: "attribute_not_exists(#token)",
                ExpressionAttributeNames: { "#token": "token" },
                //The # is DynamoDB’s placeholder syntax inside a string—it has no special 
                // JavaScript meaning here. Using a placeholder also 
                // avoids conflicts with DynamoDB reserved words.
                //
                // This just maps what we have to token
                //
            }));
            return true;
        }
        catch (error) {
            if (error instanceof client_dynamodb_1.ConditionalCheckFailedException)
                return false;
            throw error;
        }
    }
    async getAuthToken(token) {
        const { Item: item } = await this.client.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { token },
            ConsistentRead: true,
            ProjectionExpression: "#token, userAlias, lastActiveTimestamp",
            ExpressionAttributeNames: { "#token": "token" },
        }));
        if (item === undefined)
            return null;
        if (typeof item.token !== "string" || !item.token.trim() || item.token !== token ||
            typeof item.userAlias !== "string" || !item.userAlias.trim() ||
            !isTimestamp(item.lastActiveTimestamp)) {
            throw new Error("Invalid auth token record stored in database");
        }
        return { token: item.token, userAlias: item.userAlias, lastActiveTimestamp: item.lastActiveTimestamp };
    }
    async updateLastActiveTimestamp(token, timestamp) {
        if (!isTimestamp(timestamp))
            throw new Error("Invalid last active timestamp");
        while (true) {
            try {
                await this.client.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: this.tableName,
                    Key: { token },
                    UpdateExpression: "SET lastActiveTimestamp = :timestamp",
                    ConditionExpression: "attribute_exists(#token) AND lastActiveTimestamp <= :timestamp",
                    ExpressionAttributeNames: { "#token": "token" },
                    ExpressionAttributeValues: { ":timestamp": timestamp },
                }));
                return true;
            }
            catch (error) {
                if (!(error instanceof client_dynamodb_1.ConditionalCheckFailedException))
                    throw error;
                // Failure can mean missing OR already newer. A read distinguishes them.
                const current = await this.getAuthToken(token);
                if (current === null)
                    return false;
                if (current.lastActiveTimestamp >= timestamp)
                    return true;
                // If the token was deleted and recreated before the read, retry the
                // conditional write. Every attempt still requires an existing session.
            }
        }
    }
    async deleteAuthToken(token) {
        await this.client.send(new lib_dynamodb_1.DeleteCommand({ TableName: this.tableName, Key: { token } }));
    }
}
exports.DynamoAuthTokenDAO = DynamoAuthTokenDAO;
