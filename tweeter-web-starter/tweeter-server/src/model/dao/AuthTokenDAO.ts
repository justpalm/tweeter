// AI-assisted: see AI-ATTRIBUTION.md

/** Server-side session data; timestamps use milliseconds since the Unix epoch. */
export interface AuthTokenRecord {
  readonly token: string;
  readonly userAlias: string;
  readonly lastActiveTimestamp: number;
}

/**
 * Session storage independent of the database. Services generate tokens and
 * check inactivity expiration; reading a record does not establish authorization.
 * Storage failures reject the promise rather than appearing as missing records.
 */
export interface AuthTokenDAO {
  /**
   * Creates a session atomically; returns false if its token exists,
   * without overwriting it.
   */
  createAuthToken(record: AuthTokenRecord): Promise<boolean>;

  /** Returns the stored session, or null if absent. Does not refresh activity. */
  getAuthToken(token: string): Promise<AuthTokenRecord | null>;

  /**
   * Advances activity to the later of the stored and supplied timestamps.
   * Returns false if absent; must not recreate a session deleted by logout.
   * The service must check expiration before requesting this update.
   */
  updateLastActiveTimestamp(token: string, timestamp: number): Promise<boolean>;

  /** Deletes the session. An already-absent token is a successful no-op. */
  deleteAuthToken(token: string): Promise<void>;
}
