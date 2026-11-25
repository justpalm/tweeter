// AI-assisted: see AI-ATTRIBUTION.md
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createHash } from "node:crypto";
import type { StatusDto } from "tweeter-shared";
import type { StatusCursor, StatusPage } from "../StoryDAO";

export const statusClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** IEEE-754 big-endian bytes preserve order for finite nonnegative numbers,
 * including zero/fractions accepted by existing cursors. Author breaks feed ties.
 * Author timestamps are made unique by conditional story creation.
 */
export function statusKey(cursor: StatusCursor): string {
  if (!Number.isFinite(cursor.timestamp) || cursor.timestamp < 0) {
    throw new Error("bad-request: Invalid status timestamp");
  }
  const time = Buffer.alloc(8);
  time.writeDoubleBE(cursor.timestamp === 0 ? 0 : cursor.timestamp);
  const author = createHash("sha256").update(cursor.authorAlias).digest("hex");
  return `${time.toString("hex")}#${author}`;
}

export function statusItem(ownerAlias: string, status: StatusDto) {
  return { owner_alias: ownerAlias,
    status_key: statusKey({ authorAlias: status.user.alias, timestamp: status.timestamp }), status };
}

/** Shared storage mechanics, separate from the database-independent DAO contracts. */
export class DynamoStatusStore {
  public constructor(
    protected readonly tableName: string,
    protected readonly client: DynamoDBDocumentClient = statusClient,
  ) {
    if (!tableName.trim()) throw new Error("Status table name is required");
  }

  protected async getPage(ownerAlias: string, pageSize: number, after: StatusCursor | null): Promise<StatusPage> {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new Error("bad-request: Page size must be an integer from 1 to 100");
    }
    const items: StatusDto[] = [];
    let startKey: Record<string, unknown> | undefined;
    do {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName, ConsistentRead: true, ScanIndexForward: false,
        KeyConditionExpression: "owner_alias = :owner" + (after === null ? "" : " AND status_key < :after"),
        ExpressionAttributeValues: { ":owner": ownerAlias, ...(after === null ? {} : { ":after": statusKey(after) }) },
        ProjectionExpression: "#status", ExpressionAttributeNames: { "#status": "status" },
        Limit: pageSize + 1 - items.length, ExclusiveStartKey: startKey,
      }));
      for (const item of result.Items ?? []) {
        const status = item.status as StatusDto | undefined;
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
