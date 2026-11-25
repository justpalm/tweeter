// AI-assisted: see AI-ATTRIBUTION.md
import { BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { StatusDto } from "tweeter-shared";
import type { FeedDAO } from "../FeedDAO";
import type { StatusCursor } from "../StoryDAO";
import { DynamoStatusStore, statusItem } from "./DynamoStatusStore";

export class DynamoFeedDAO extends DynamoStatusStore implements FeedDAO {
  public async addToFeeds(recipientAliases: readonly string[], status: StatusDto): Promise<void> {
    const aliases = [...new Set(recipientAliases)];
    for (let offset = 0; offset < aliases.length; offset += 25) {
      let pending = aliases.slice(offset, offset + 25).map(alias => ({ PutRequest: { Item: statusItem(alias, status) } }));
      for (let attempt = 0; pending.length; attempt++) {
        const result = await this.client.send(new BatchWriteCommand({ RequestItems: { [this.tableName]: pending } }));
        const remaining = result.UnprocessedItems?.[this.tableName] ?? [];
        if (!remaining.length) break;
        if (attempt >= 6) throw new Error("internal-server-error: Feed delivery incomplete; some writes remain");
        // Retry only the unprocessed subset with bounded exponential backoff/jitter.
        pending = remaining as typeof pending;
        await new Promise(resolve => setTimeout(resolve, Math.min(100 * 2 ** attempt, 1600) + Math.random() * 100));
      }
    }
  }

  public getFeed(ownerAlias: string, pageSize: number, after: StatusCursor | null) {
    return this.getPage(ownerAlias, pageSize, after);
  }
}
