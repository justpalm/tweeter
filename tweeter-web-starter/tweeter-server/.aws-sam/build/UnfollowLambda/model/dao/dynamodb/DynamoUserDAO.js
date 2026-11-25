"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoUserDAO = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const tweeter_shared_1 = require("tweeter-shared");
// Reuse the SDK client across DAO instances and warm Lambda invocations.
// Region and credentials come from the standard AWS environment/configuration.
const documentClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({}));
/** Expects a table with a string partition key named alias and no sort key. */
class DynamoUserDAO {
    tableName;
    client;
    constructor(tableName, client = documentClient) {
        this.tableName = tableName;
        this.client = client;
        if (tableName.trim().length === 0) {
            throw new Error("User table name is required");
        }
    }
    async createUser(user, passwordHash) {
        const command = new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: { ...user.dto, passwordHash },
            // One conditional write prevents concurrent registrations overwriting users.
            ConditionExpression: "attribute_not_exists(#alias)",
            ExpressionAttributeNames: { "#alias": "alias" },
        });
        try {
            await this.client.send(command);
            return true;
        }
        catch (error) {
            if (error instanceof client_dynamodb_1.ConditionalCheckFailedException) {
                return false;
            }
            throw error;
        }
    }
    async getUserByAlias(alias) {
        const { Item: item } = await this.client.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { alias },
            ConsistentRead: true,
            ProjectionExpression: "firstName, lastName, #alias, imageUrl",
            ExpressionAttributeNames: { "#alias": "alias" },
        }));
        if (item === undefined)
            return null;
        if (typeof item.firstName !== "string" || typeof item.lastName !== "string" ||
            typeof item.alias !== "string" || typeof item.imageUrl !== "string") {
            throw new Error("Invalid user profile stored in database");
        }
        // Construct the public object explicitly so private fields cannot escape.
        return new tweeter_shared_1.User(item.firstName, item.lastName, item.alias, item.imageUrl);
    }
    async getPasswordHash(alias) {
        const { Item: item } = await this.client.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { alias },
            ConsistentRead: true,
            ProjectionExpression: "passwordHash",
        }));
        if (item === undefined)
            return null;
        if (typeof item.passwordHash !== "string" || item.passwordHash.length === 0) {
            throw new Error("Invalid password hash stored in database");
        }
        return item.passwordHash;
    }
}
exports.DynamoUserDAO = DynamoUserDAO;
