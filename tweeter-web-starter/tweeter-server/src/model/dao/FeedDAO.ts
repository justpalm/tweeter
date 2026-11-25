// AI-assisted: see AI-ATTRIBUTION.md
import type { StatusDto } from "tweeter-shared";
import type { StatusCursor, StatusPage } from "./StoryDAO";

export interface FeedDAO {
  /** Materialize recipient copies; resolve only after all writes finish. */
  addToFeeds(recipientAliases: readonly string[], status: StatusDto): Promise<void>;
  getFeed(ownerAlias: string, pageSize: number, after: StatusCursor | null): Promise<StatusPage>;
}
