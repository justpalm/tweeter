// AI-assisted: see AI-ATTRIBUTION.md
import { ConditionalCheckFailedException, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { User } from "tweeter-shared";
import type { UserDAO } from "../UserDAO";

// Reuse the SDK client across DAO instances and warm Lambda invocations.
// Region and credentials come from the standard AWS environment/configuration.
const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** Expects a table with a string partition key named alias and no sort key. */
export class DynamoUserDAO implements UserDAO {
  public constructor(
    private readonly tableName: string,
    private readonly client: DynamoDBDocumentClient = documentClient,
  ) {
    if (tableName.trim().length === 0) {
      throw new Error("User table name is required");
    }
  }

  public async createUser(user: User, passwordHash: string): Promise<boolean> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: { ...user.dto, passwordHash },
      // One conditional write prevents concurrent registrations overwriting users.
      ConditionExpression: "attribute_not_exists(#alias)",
      ExpressionAttributeNames: { "#alias": "alias" },
    });

    try {
      await this.client.send(command);
      return true;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        return false;
      }
      throw error;
    }
  }

  public async getUserByAlias(alias: string): Promise<User | null> {
    const { Item: item } = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { alias },
      ConsistentRead: true,
      ProjectionExpression: "firstName, lastName, #alias, imageUrl",
      ExpressionAttributeNames: { "#alias": "alias" },
    }));

    if (item === undefined) return null;
    if (typeof item.firstName !== "string" || typeof item.lastName !== "string" ||
        typeof item.alias !== "string" || typeof item.imageUrl !== "string") {
      throw new Error("Invalid user profile stored in database");
    }

    // Construct the public object explicitly so private fields cannot escape.
    return new User(item.firstName, item.lastName, item.alias, item.imageUrl);
  }

  public async getPasswordHash(alias: string): Promise<string | null> {
    const { Item: item } = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { alias },
      ConsistentRead: true,
      ProjectionExpression: "passwordHash",
    }));

    if (item === undefined) return null;
    if (typeof item.passwordHash !== "string" || item.passwordHash.length === 0) {
      throw new Error("Invalid password hash stored in database");
    }
    return item.passwordHash;
  }
}
