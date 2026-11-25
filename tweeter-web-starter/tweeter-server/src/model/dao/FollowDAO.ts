// AI-assisted: see AI-ATTRIBUTION.md
export interface FollowCounts {
  readonly followerCount: number;
  readonly followeeCount: number;
}

export interface AliasPage {
  readonly aliases: string[];
  readonly hasMore: boolean;
}

/** Database-independent storage. Services authenticate and supply the stored session owner. */
export interface FollowDAO {
  isFollowing(followerAlias: string, followeeAlias: string): Promise<boolean>;
  /** Missing users return null; absent counters on existing users mean zero. */
  getCounts(userAlias: string): Promise<FollowCounts | null>;
  /** Sorted by alias; afterAlias is exclusive. Page size is 1–100. */
  getFollowers(userAlias: string, pageSize: number, afterAlias: string | null): Promise<AliasPage>;
  getFollowees(userAlias: string, pageSize: number, afterAlias: string | null): Promise<AliasPage>;
  /** Atomically update the relationship and both users' counters.
   * false means already following / already absent, respectively. Other failures reject.
   * Both users must exist; self-follow is invalid. Unfollow requires positive counters.
   */
  follow(followerAlias: string, followeeAlias: string): Promise<boolean>;
  unfollow(followerAlias: string, followeeAlias: string): Promise<boolean>;
}
