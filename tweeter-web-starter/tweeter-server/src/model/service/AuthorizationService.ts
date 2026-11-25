// AI-assisted: see AI-ATTRIBUTION.md
import type { DAOFactory } from "../dao/factory/DAOFactory";

/** Checks server-stored sessions. Reading a token alone does not authenticate it. */
export class AuthorizationService {
  private static readonly INACTIVITY_TIMEOUT_MS = 60_000;

  public constructor(
    private readonly daoFactory: DAOFactory,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** Returns the stored owner; never derives identity/time from a client payload. */
  public async authenticate(token: string): Promise<string> {
    if (!token.trim()) throw new Error("unauthorized: Invalid or expired session");
    const dao = this.daoFactory.getAuthTokenDAO();
    const session = await dao.getAuthToken(token);
    const timestamp = this.now();
    // Exactly one minute is expired. Reject future activity rather than granting
    // extra lifetime when clocks disagree. The DAO validates stored field types.
    if (session === null || session.lastActiveTimestamp > timestamp ||
        timestamp - session.lastActiveTimestamp >= AuthorizationService.INACTIVITY_TIMEOUT_MS) {
      throw new Error("unauthorized: Invalid or expired session");
    }
    // Check expiry BEFORE refreshing. A concurrent logout must stay logged out.
    if (!await dao.updateLastActiveTimestamp(token, timestamp)) {
      throw new Error("unauthorized: Invalid or expired session");
    }
    return session.userAlias;
  }
}
