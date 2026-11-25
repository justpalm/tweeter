// AI-assisted: see AI-ATTRIBUTION.md
import { User } from "tweeter-shared";
import type { StatusDto } from "tweeter-shared";
import type { DAOFactory } from "../../../../../tweeter-server/src/model/dao/factory/DAOFactory";
import type { StatusCursor } from "../../../../../tweeter-server/src/model/dao/StoryDAO";
import { jest } from "@jest/globals";
import { AWSDAOFactory } from "../../../../../tweeter-server/src/model/dao/factory/AWSDAOFactory";

/** Keep the real handler/service/JSON path, substituting only storage. */
export function installStatusFixture(ownerAlias: string) {
  const fixture = statusFixture(ownerAlias);
  const factory = fixture.factory;
  jest.spyOn(AWSDAOFactory.prototype, "getStoryDAO").mockImplementation(factory.getStoryDAO);
  jest.spyOn(AWSDAOFactory.prototype, "getFeedDAO").mockImplementation(factory.getFeedDAO);
  jest.spyOn(AWSDAOFactory.prototype, "getFollowDAO").mockImplementation(factory.getFollowDAO);
  jest.spyOn(AWSDAOFactory.prototype, "getUserDAO").mockImplementation(factory.getUserDAO);
  jest.spyOn(AWSDAOFactory.prototype, "getAuthTokenDAO").mockImplementation(factory.getAuthTokenDAO);
  return fixture;
}

/** In-memory alternative DAO implementation for service and JSON contract tests. */
export function statusFixture(ownerAlias = "@owner") {
  const profiles = new Map([ownerAlias, "@reader", "@later", "@other"].map(alias =>
    [alias, new User("Real", "Student", alias, "https://example.com/profile.png")]));
  const followers = new Set(["@reader"]);
  const stories = new Map<string, StatusDto[]>();
  const feeds = new Map<string, StatusDto[]>();
  const compare = (a: StatusCursor, b: StatusCursor) =>
    b.timestamp - a.timestamp || b.authorAlias.localeCompare(a.authorAlias);
  const cursor = (s: StatusDto): StatusCursor => ({ authorAlias: s.user.alias, timestamp: s.timestamp });
  const page = (rows: StatusDto[], size: number, after: StatusCursor | null) => {
    const sorted = [...rows].sort((a, b) => compare(cursor(a), cursor(b)))
      .filter(s => after === null || compare(cursor(s), after) > 0);
    return { items: sorted.slice(0, size), hasMore: sorted.length > size };
  };
  const factory: DAOFactory = {
    getStoryDAO: () => story,
    getFeedDAO: () => feed,
    getUserDAO: () => ({ getUserByAlias: async alias => profiles.get(alias) ?? null,
      getPasswordHash: async () => null, createUser: async () => true }),
    getAuthTokenDAO: () => ({ getAuthToken: async token => token === "missing" ? null
      : { token, userAlias: ownerAlias, lastActiveTimestamp: token === "expired" ? 0 : Date.now() },
      updateLastActiveTimestamp: async () => true, deleteAuthToken: async () => {}, createAuthToken: async () => true }),
    getFollowDAO: () => ({ getPostingFollowers: async () => [...followers],
      follow: async () => true, unfollow: async () => true, isFollowing: async () => false,
      getCounts: async () => ({ followerCount: 0, followeeCount: 0 }),
      getFollowers: async () => ({ aliases: [], hasMore: false }), getFollowees: async () => ({ aliases: [], hasMore: false }) }),
    getImageDAO: () => { throw new Error("Unexpected image storage"); },
  };
  const story: ReturnType<DAOFactory["getStoryDAO"]> = {
    createStatus: async status => {
      const rows = stories.get(status.user.alias) ?? [];
      if (rows.some(s => s.timestamp === status.timestamp)) return false;
      stories.set(status.user.alias, [...rows, status]);
      return true;
    },
    getStory: async (alias, size, after) => page(stories.get(alias) ?? [], size, after),
  };
  const feed: ReturnType<DAOFactory["getFeedDAO"]> = {
    addToFeeds: async (aliases, status) => {
      for (const alias of aliases) feeds.set(alias, [...(feeds.get(alias) ?? []), status]);
    },
    getFeed: async (alias, size, after) => page(feeds.get(alias) ?? [], size, after),
  };
  return { factory, profiles, followers, stories, feeds, story, feed };
}
