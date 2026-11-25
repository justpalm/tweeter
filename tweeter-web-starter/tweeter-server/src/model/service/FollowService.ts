// AI-assisted: see AI-ATTRIBUTION.md
import type { UserDto } from "tweeter-shared";
import type { DAOFactory } from "../dao/factory/DAOFactory";
import { AuthorizationService } from "./AuthorizationService";

export class FollowService {
  public constructor(private readonly daoFactory: DAOFactory) {}

  public async isFollowing(token: string, followerAlias: string, followeeAlias: string): Promise<boolean> {
    const actor = await new AuthorizationService(this.daoFactory).authenticate(token);
    if (followerAlias !== actor) throw new Error("unauthorized: Follower must match the session owner");
    return actor === followeeAlias ? false : this.daoFactory.getFollowDAO().isFollowing(actor, followeeAlias);
  }

  public async getFollowerCount(token: string, userAlias: string): Promise<number> {
    await new AuthorizationService(this.daoFactory).authenticate(token);
    return (await this.requireCounts(userAlias)).followerCount;
  }

  public async getFolloweeCount(token: string, userAlias: string): Promise<number> {
    await new AuthorizationService(this.daoFactory).authenticate(token);
    return (await this.requireCounts(userAlias)).followeeCount;
  }

  public loadMoreFollowers(token: string, userAlias: string, pageSize: number,
    lastItem: UserDto | null): Promise<[UserDto[], boolean]> {
    return this.loadPage(token, userAlias, pageSize, lastItem, true);
  }

  public loadMoreFollowees(token: string, userAlias: string, pageSize: number,
    lastItem: UserDto | null): Promise<[UserDto[], boolean]> {
    return this.loadPage(token, userAlias, pageSize, lastItem, false);
  }

  private async loadPage(token: string, userAlias: string, pageSize: number,
    lastItem: UserDto | null, followers: boolean): Promise<[UserDto[], boolean]> {
    await new AuthorizationService(this.daoFactory).authenticate(token);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new Error("bad-request: Page size must be an integer from 1 to 100");
    }
    await this.requireUser(userAlias);
    const dao = this.daoFactory.getFollowDAO();
    const afterAlias = lastItem?.alias ?? null;
    const page = await (followers ? dao.getFollowers(userAlias, pageSize, afterAlias)
      : dao.getFollowees(userAlias, pageSize, afterAlias));
    const users = await Promise.all(page.aliases.map(async alias => {
      const user = await this.daoFactory.getUserDAO().getUserByAlias(alias);
      // Do not silently drop rows: that could lose the client's pagination boundary.
      if (user === null) throw new Error("internal-server-error: Follow profile unavailable");
      return user.dto;
    }));
    return [users, page.hasMore];
  }

  public follow(token: string, userAlias: string): Promise<[followerCount: number, followeeCount: number]> {
    return this.changeFollowStatus(token, userAlias, true);
  }

  public unfollow(token: string, userAlias: string): Promise<[followerCount: number, followeeCount: number]> {
    return this.changeFollowStatus(token, userAlias, false);
  }

  private async changeFollowStatus(token: string, target: string, adding: boolean): Promise<[number, number]> {
    const actor = await new AuthorizationService(this.daoFactory).authenticate(token);
    if (actor === target) throw new Error("bad-request: Cannot follow or unfollow yourself");
    await Promise.all([this.requireUser(actor), this.requireUser(target)]);
    const dao = this.daoFactory.getFollowDAO();
    const changed = await (adding ? dao.follow(actor, target) : dao.unfollow(actor, target));
    if (!changed) throw new Error(adding ? "bad-request: Already following user" : "bad-request: Not following user");
    // The existing response displays BOTH counts for the target user's profile.
    const counts = await this.requireCounts(target);
    return [counts.followerCount, counts.followeeCount];
  }

  private async requireUser(alias: string) {
    const user = await this.daoFactory.getUserDAO().getUserByAlias(alias);
    if (user === null) throw new Error("bad-request: User not found");
    return user;
  }

  private async requireCounts(alias: string) {
    const counts = await this.daoFactory.getFollowDAO().getCounts(alias);
    if (counts === null) throw new Error("bad-request: User not found");
    return counts;
  }
}
