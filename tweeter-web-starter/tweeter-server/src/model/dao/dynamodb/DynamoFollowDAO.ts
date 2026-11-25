// AI-assisted: see AI-ATTRIBUTION.md
import { DynamoDBClient, TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { AliasPage, FollowCounts, FollowDAO } from "../FollowDAO";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** Maps application aliases onto the existing exercise table's handle attributes. */
export class DynamoFollowDAO implements FollowDAO {
  public constructor(
    private readonly tableName: string,
    private readonly userTableName: string,
    private readonly indexName: string,
    private readonly client: DynamoDBDocumentClient = documentClient,
  ) {
    if (![tableName, userTableName, indexName].every(value => value.trim())) {
      throw new Error("Follow table, user table, and reverse index names are required");
    }
  }

  public async isFollowing(followerAlias: string, followeeAlias: string): Promise<boolean> {
    const { Item } = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { follower_handle: followerAlias, followee_handle: followeeAlias },
      ConsistentRead: true,
    }));
    return Item !== undefined;
  }

  public async getCounts(userAlias: string): Promise<FollowCounts | null> {
    const { Item } = await this.client.send(new GetCommand({
      TableName: this.userTableName, Key: { alias: userAlias }, ConsistentRead: true,
      ProjectionExpression: "alias, followerCount, followeeCount",
    }));
    if (Item === undefined) return null;
    const followerCount = Item.followerCount === undefined ? 0 : Item.followerCount;
    const followeeCount = Item.followeeCount === undefined ? 0 : Item.followeeCount;
    if (![followerCount, followeeCount].every(value => Number.isSafeInteger(value) && value >= 0)) {
      throw new Error("Invalid stored follow counts");
    }
    return { followerCount, followeeCount };
  }

  public getFollowers(userAlias: string, pageSize: number, afterAlias: string | null): Promise<AliasPage> {
    return this.getPage(userAlias, pageSize, afterAlias, true);
  }

  public getFollowees(userAlias: string, pageSize: number, afterAlias: string | null): Promise<AliasPage> {
    return this.getPage(userAlias, pageSize, afterAlias, false);
  }

  private async getPage(userAlias: string, pageSize: number, afterAlias: string | null,
    followers: boolean): Promise<AliasPage> {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new Error("Page size must be an integer from 1 to 100");
    }
    const partition = followers ? "followee_handle" : "follower_handle";
    const sort = followers ? "follower_handle" : "followee_handle";
    const aliases: string[] = [];
    let startKey: Record<string, unknown> | undefined;
    // Read one extra alias to determine hasMore, including across DynamoDB's byte limit.
    do {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName, IndexName: followers ? this.indexName : undefined,
        ConsistentRead: !followers, ScanIndexForward: true,
        KeyConditionExpression: "#pk = :user" + (afterAlias === null ? "" : " AND #sk > :after"),
        ExpressionAttributeNames: { "#pk": partition, "#sk": sort },
        ExpressionAttributeValues: { ":user": userAlias, ...(afterAlias === null ? {} : { ":after": afterAlias }) },
        ProjectionExpression: "#sk", Limit: pageSize + 1 - aliases.length,
        ExclusiveStartKey: startKey,
      }));
      for (const item of result.Items ?? []) {
        if (typeof item[sort] !== "string") throw new Error("Invalid stored follow alias");
        aliases.push(item[sort]);
      }
      startKey = result.LastEvaluatedKey;
    } while (startKey && aliases.length <= pageSize);
    return { aliases: aliases.slice(0, pageSize), hasMore: aliases.length > pageSize };
  }

  public follow(followerAlias: string, followeeAlias: string): Promise<boolean> {
    return this.change(followerAlias, followeeAlias, true);
  }

  public unfollow(followerAlias: string, followeeAlias: string): Promise<boolean> {
    return this.change(followerAlias, followeeAlias, false);
  }

  private async change(followerAlias: string, followeeAlias: string, adding: boolean): Promise<boolean> {
    if (followerAlias === followeeAlias) throw new Error("Cannot follow yourself");
    const key = { follower_handle: followerAlias, followee_handle: followeeAlias };
    const relationship = { TableName: this.tableName,
      ConditionExpression: adding ? "attribute_not_exists(follower_handle)" : "attribute_exists(follower_handle)" };
    const counters = [[followerAlias, "followeeCount"], [followeeAlias, "followerCount"]];
    try {
      await this.client.send(new TransactWriteCommand({
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
    } catch (error) {
      // A known relationship conflict is a no-op; user/counter/storage failures stay errors.
      if (error instanceof TransactionCanceledException && error.CancellationReasons?.[0]?.Code === "ConditionalCheckFailed" &&
          error.CancellationReasons.slice(1).every(reason => reason.Code === "None" || reason.Code === "ConditionalCheckFailed")) return false;
      throw error;
    }
  }
}
