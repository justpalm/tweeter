// AI-assisted: see AI-ATTRIBUTION.md
import type { UserDAO } from "../UserDAO";
import type { AuthTokenDAO } from "../AuthTokenDAO";
import type { ImageDAO } from "../ImageDAO";
import type { FollowDAO } from "../FollowDAO";

/** Supplies database-independent DAOs to services. Expand as more DAOs are added. */
export interface DAOFactory {
  getFollowDAO(): FollowDAO;
  getUserDAO(): UserDAO;
  getAuthTokenDAO(): AuthTokenDAO;
  getImageDAO(): ImageDAO;
}
