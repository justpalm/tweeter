/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, expect, it, jest } from "@jest/globals";
import { User } from "tweeter-shared";
import { setImmediate as nextTurn } from "node:timers/promises";
import type { DAOFactory } from "../../../../tweeter-server/src/model/dao/factory/DAOFactory";
import type { FollowDAO } from "../../../../tweeter-server/src/model/dao/FollowDAO";
import { FollowService } from "../../../../tweeter-server/src/model/service/FollowService";

const profile = (alias: string) => new User("Test", "User", alias, "image-url");
function setup() {
  const mutate = jest.fn<FollowDAO["follow"]>().mockResolvedValue(true);
  const unfollow = jest.fn<FollowDAO["unfollow"]>().mockResolvedValue(true);
  const counts = jest.fn<FollowDAO["getCounts"]>().mockResolvedValue({ followerCount: 7, followeeCount: 3 });
  const page = jest.fn<FollowDAO["getFollowers"]>().mockResolvedValue({ aliases: ["@b", "@c"], hasMore: true });
  const followees = jest.fn<FollowDAO["getFollowees"]>().mockResolvedValue({ aliases: ["@b", "@c"], hasMore: true });
  const lookup = jest.fn<(alias: string) => Promise<User | null>>().mockImplementation(async alias => profile(alias));
  const status = jest.fn<FollowDAO["isFollowing"]>().mockResolvedValue(true);
  const session = jest.fn(async () => ({ token: "session", userAlias: "@owner", lastActiveTimestamp: Date.now() }));
  const refresh = jest.fn(async () => true);
  const factory: DAOFactory = {
    getStoryDAO: () => { throw new Error("Unexpected story DAO request"); },
    getFeedDAO: () => { throw new Error("Unexpected feed DAO request"); },
    getFollowDAO: () => ({ getPostingFollowers: async () => [], follow: mutate, unfollow, getCounts: counts,
      getFollowers: page, getFollowees: followees, isFollowing: status }),
    getUserDAO: () => ({ getUserByAlias: lookup, createUser: async () => true, getPasswordHash: async () => null }),
    getAuthTokenDAO: () => ({ getAuthToken: session, updateLastActiveTimestamp: refresh,
      createAuthToken: async () => true, deleteAuthToken: async () => {} }),
    getImageDAO: () => { throw new Error("Unexpected image storage"); },
  };
  return { service: new FollowService(factory), mutate, unfollow, counts, page, followees, lookup, status, session, refresh };
}
afterEach(() => { jest.restoreAllMocks(); });

it.each(["follow", "unfollow"] as const)("%s uses stored owner, awaits writes, and returns target counts", async operation => {
  const state = setup();
  const { service, counts, refresh } = state;
  const mutate = operation === "follow" ? state.mutate : state.unfollow;
  let finish!: (value: boolean) => void;
  mutate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const result = service[operation]("session", "@target");
  await nextTurn();
  expect(finish).toBeDefined();
  expect(counts).not.toHaveBeenCalled();
  expect(mutate).toHaveBeenCalledWith("@owner", "@target");
  finish(true);
  expect(await result).toEqual([7, 3]);
  expect(counts).toHaveBeenCalledWith("@target");
  expect(refresh).toHaveBeenCalledTimes(1);
  mutate.mockResolvedValue(false);
  await expect(service[operation]("session", "@target")).rejects.toThrow("bad-request:");
  mutate.mockClear();
  await expect(service[operation]("session", "@owner")).rejects.toThrow("yourself");
  expect(mutate).not.toHaveBeenCalled();
});

it.each(["loadMoreFollowers", "loadMoreFollowees"] as const)("%s preserves alias cursor, order, DTOs, and hasMore", async operation => {
  const state = setup();
  const { service, lookup } = state;
  const page = operation === "loadMoreFollowers" ? state.page : state.followees;
  expect(await service[operation]("session", "@target", 2, profile("@a").dto))
    .toEqual([[profile("@b").dto, profile("@c").dto], true]);
  expect(page).toHaveBeenCalledWith("@target", 2, "@a");
  page.mockResolvedValue({ aliases: [], hasMore: false });
  expect(await service[operation]("session", "@target", 2, null)).toEqual([[], false]);
  await expect(service[operation]("session", "@target", 101, null)).rejects.toThrow("bad-request:");
  page.mockResolvedValue({ aliases: ["@missing"], hasMore: false });
  lookup.mockImplementation(async alias => alias === "@missing" ? null : profile(alias));
  await expect(service[operation]("session", "@target", 2, null)).rejects.toThrow("internal-server-error:");
});

it("authenticates read operations, allows other profiles, and rejects spoofed actors", async () => {
  const { service, counts, status } = setup();
  expect(await service.getFollowerCount("session", "@target")).toBe(7);
  expect(await service.getFolloweeCount("session", "@target")).toBe(3);
  expect(await service.isFollowing("session", "@owner", "@target")).toBe(true);
  expect(status).toHaveBeenCalledWith("@owner", "@target");
  await expect(service.isFollowing("session", "@spoof", "@target")).rejects.toThrow("unauthorized:");
  expect(status).toHaveBeenCalledTimes(1);
  expect(await service.isFollowing("session", "@owner", "@owner")).toBe(false);
  counts.mockResolvedValue({ followerCount: 0, followeeCount: 0 });
  expect(await service.getFollowerCount("session", "@target")).toBe(0);
});

it.each(["missing", "expired", "logged out"])("blocks all seven operations for a %s session before data access", async state => {
  const { service, session, refresh, mutate, unfollow, counts, page, followees, status, lookup } = setup();
  if (state === "missing") session.mockResolvedValue(null as never);
  if (state === "expired") session.mockResolvedValue({ token: "session", userAlias: "@owner", lastActiveTimestamp: Date.now() - 60_000 });
  if (state === "logged out") refresh.mockResolvedValue(false);
  const operations = [() => service.follow("session", "@target"), () => service.unfollow("session", "@target"),
    () => service.getFollowerCount("session", "@target"), () => service.getFolloweeCount("session", "@target"),
    () => service.isFollowing("session", "@owner", "@target"),
    () => service.loadMoreFollowers("session", "@target", 2, null), () => service.loadMoreFollowees("session", "@target", 2, null)];
  for (const operation of operations) await expect(operation()).rejects.toThrow("unauthorized:");
  for (const data of [mutate, unfollow, counts, page, followees, status, lookup]) expect(data).not.toHaveBeenCalled();
});

it("reports missing users and propagates storage failures", async () => {
  const { service, lookup, counts, mutate } = setup();
  lookup.mockResolvedValue(null);
  await expect(service.follow("session", "@target")).rejects.toThrow("User not found");
  expect(mutate).not.toHaveBeenCalled();
  counts.mockResolvedValue(null);
  await expect(service.getFolloweeCount("session", "@missing")).rejects.toThrow("User not found");
  lookup.mockImplementation(async alias => profile(alias));
  const failure = new Error("storage failure");
  mutate.mockRejectedValue(failure);
  await expect(service.follow("session", "@target")).rejects.toBe(failure);
});
