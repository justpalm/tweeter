"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoFollowDAO = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const documentClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({}));
/** Maps application aliases onto the existing exercise table's handle attributes. */
class DynamoFollowDAO {
    tableName;
    userTableName;
    indexName;
    client;
    /** Simple 4A path: strongly read base relationships so a completed follow is
     * visible immediately. Intentionally trades scan cost for correctness here;
     * reverse GSI-only delivery can omit a freshly added follower.
     */
    async getPostingFollowers(authorAlias) {
        const aliases = [];
        let startKey;
        do {
            const result = await this.client.send(new lib_dynamodb_1.ScanCommand({
                TableName: this.tableName, ConsistentRead: true,
                FilterExpression: "followee_handle = :author",
                ExpressionAttributeValues: { ":author": authorAlias },
                ProjectionExpression: "follower_handle", ExclusiveStartKey: startKey,
            }));
            for (const item of result.Items ?? []) {
                if (typeof item.follower_handle !== "string")
                    throw new Error("Invalid stored follower alias");
                aliases.push(item.follower_handle);
            }
            startKey = result.LastEvaluatedKey;
        } while (startKey);
        return [...new Set(aliases)];
    }
    constructor(tableName, userTableName, indexName, client = documentClient) {
        this.tableName = tableName;
        this.userTableName = userTableName;
        this.indexName = indexName;
        this.client = client;
        if (![tableName, userTableName, indexName].every(value => value.trim())) {
            throw new Error("Follow table, user table, and reverse index names are required");
        }
    }
    async isFollowing(followerAlias, followeeAlias) {
        const { Item } = await this.client.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { follower_handle: followerAlias, followee_handle: followeeAlias },
            ConsistentRead: true,
        }));
        return Item !== undefined;
    }
    async getCounts(userAlias) {
        const { Item } = await this.client.send(new lib_dynamodb_1.GetCommand({
            TableName: this.userTableName, Key: { alias: userAlias }, ConsistentRead: true,
            ProjectionExpression: "alias, followerCount, followeeCount",
        }));
        if (Item === undefined)
            return null;
        const followerCount = Item.followerCount === undefined ? 0 : Item.followerCount;
        const followeeCount = Item.followeeCount === undefined ? 0 : Item.followeeCount;
        if (![followerCount, followeeCount].every(value => Number.isSafeInteger(value) && value >= 0)) {
            throw new Error("Invalid stored follow counts");
        }
        return { followerCount, followeeCount };
    }
    getFollowers(userAlias, pageSize, afterAlias) {
        return this.getPage(userAlias, pageSize, afterAlias, true);
    }
    getFollowees(userAlias, pageSize, afterAlias) {
        return this.getPage(userAlias, pageSize, afterAlias, false);
    }
    async getPage(userAlias, pageSize, afterAlias, followers) {
        if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
            throw new Error("Page size must be an integer from 1 to 100");
        }
        const partition = followers ? "followee_handle" : "follower_handle";
        const sort = followers ? "follower_handle" : "followee_handle";
        const aliases = [];
        let startKey;
        // Read one extra alias to determine hasMore, including across DynamoDB's byte limit.
        do {
            const result = await this.client.send(new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName, IndexName: followers ? this.indexName : undefined,
                ConsistentRead: !followers, ScanIndexForward: true,
                KeyConditionExpression: "#pk = :user" + (afterAlias === null ? "" : " AND #sk > :after"),
                ExpressionAttributeNames: { "#pk": partition, "#sk": sort },
                ExpressionAttributeValues: { ":user": userAlias, ...(afterAlias === null ? {} : { ":after": afterAlias }) },
                ProjectionExpression: "#sk", Limit: pageSize + 1 - aliases.length,
                ExclusiveStartKey: startKey,
            }));
            for (const item of result.Items ?? []) {
                if (typeof item[sort] !== "string")
                    throw new Error("Invalid stored follow alias");
                aliases.push(item[sort]);
            }
            startKey = result.LastEvaluatedKey;
        } while (startKey && aliases.length <= pageSize);
        return { aliases: aliases.slice(0, pageSize), hasMore: aliases.length > pageSize };
    }
    follow(followerAlias, followeeAlias) {
        return this.change(followerAlias, followeeAlias, true);
    }
    unfollow(followerAlias, followeeAlias) {
        return this.change(followerAlias, followeeAlias, false);
    }
    async change(followerAlias, followeeAlias, adding) {
        if (followerAlias === followeeAlias)
            throw new Error("Cannot follow yourself");
        const key = { follower_handle: followerAlias, followee_handle: followeeAlias };
        const relationship = { TableName: this.tableName,
            ConditionExpression: adding ? "attribute_not_exists(follower_handle)" : "attribute_exists(follower_handle)" };
        const counters = [[followerAlias, "followeeCount"], [followeeAlias, "followerCount"]];
        try {
            await this.client.send(new lib_dynamodb_1.TransactWriteCommand({
                TransactItems: [
                    adding ? { Put: { ...relationship, Item: key } } : { Delete: { ...relationship, Key: key } },
                    ...counters.map(([alias, field]) => ({ Update: {
                            TableName: this.userTableName, Key: { alias },
                            UpdateExpression: "ADD #count :delta",
                            ConditionExpression: "attribute_exists(alias)" + (adding ? "" : " AND #count >= :one"),
                            ExpressionAttributeNames: { "#count": field },
                            ExpressionAttributeValues: { ":delta": adding ? 1 : -1, ...(adding ? {} : { ":one": 1 }) },
                        } })),
                ],
            }));
            return true;
        }
        catch (error) {
            // A known relationship conflict is a no-op; user/counter/storage failures stay errors.
            if (error instanceof client_dynamodb_1.TransactionCanceledException && error.CancellationReasons?.[0]?.Code === "ConditionalCheckFailed" &&
                error.CancellationReasons.slice(1).every(reason => reason.Code === "None" || reason.Code === "ConditionalCheckFailed"))
                return false;
            throw error;
        }
    }
}
exports.DynamoFollowDAO = DynamoFollowDAO;
