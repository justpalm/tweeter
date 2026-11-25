// AI-assisted: see AI-ATTRIBUTION.md
import type { UserDAO } from "../UserDAO";
import type { AuthTokenDAO } from "../AuthTokenDAO";
import type { ImageDAO } from "../ImageDAO";
import type { FollowDAO } from "../FollowDAO";
import type { StoryDAO } from "../StoryDAO";
import type { FeedDAO } from "../FeedDAO";

/** Supplies database-independent DAOs to services. Expand as more DAOs are added. */
export interface DAOFactory {
  getStoryDAO(): StoryDAO;
  getFeedDAO(): FeedDAO;
  getFollowDAO(): FollowDAO;
  getUserDAO(): UserDAO;
  getAuthTokenDAO(): AuthTokenDAO;
  getImageDAO(): ImageDAO;
}
