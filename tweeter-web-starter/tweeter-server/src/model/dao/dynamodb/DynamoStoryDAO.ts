// AI-assisted: see AI-ATTRIBUTION.md
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import type { StatusDto } from "tweeter-shared";
import type { StatusCursor, StoryDAO } from "../StoryDAO";
import { DynamoStatusStore, statusItem } from "./DynamoStatusStore";

export class DynamoStoryDAO extends DynamoStatusStore implements StoryDAO {
  public async createStatus(status: StatusDto): Promise<boolean> {
    try {
      await this.client.send(new PutCommand({
        TableName: this.tableName, Item: statusItem(status.user.alias, status),
        ConditionExpression: "attribute_not_exists(owner_alias)",
      }));
      return true;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) return false;
      throw error;
    }
  }

  public getStory(authorAlias: string, pageSize: number, after: StatusCursor | null) {
    return this.getPage(authorAlias, pageSize, after);
  }
}
