// AI-assisted: see AI-ATTRIBUTION.md
import type { StatusDto } from "tweeter-shared";

export interface StatusCursor {
  readonly authorAlias: string;
  readonly timestamp: number;
}

export interface StatusPage {
  readonly items: StatusDto[];
  readonly hasMore: boolean;
}

/** Newest first; after is exclusive. No database-specific keys leave this interface. */
export interface StoryDAO {
  /** false means the author's timestamp is already occupied; never overwrite. */
  createStatus(status: StatusDto): Promise<boolean>;
  getStory(authorAlias: string, pageSize: number, after: StatusCursor | null): Promise<StatusPage>;
}
