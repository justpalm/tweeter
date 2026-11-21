// AI-assisted: see AI-ATTRIBUTION.md
import type { User } from "tweeter-shared";

/**
 * Storage operations for user accounts, independent of the database.
 * Storage failures reject the promise; false/null represent only the cases below.
 */
export interface UserDAO {
  /**
   * Creates an account with an already-hashed password.
   * Returns false if the alias exists, without overwriting that account.
   * Implementations must enforce alias uniqueness atomically.
   */
  createUser(user: User, passwordHash: string): Promise<boolean>;

  /** Returns the public profile, or null when the alias does not exist. */
  getUserByAlias(alias: string): Promise<User | null>;

  /**
   * Returns the stored hash for server-side password checking, or null when
   * the alias does not exist. Never include this hash in a public user profile.
   */
  getPasswordHash(alias: string): Promise<string | null>;
}
