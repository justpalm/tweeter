/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it, jest } from "@jest/globals";
import { setTimeout as delay } from "node:timers/promises";
import { User } from "tweeter-shared";
import { withFollowFixture } from "./helpers/liveFollowFixture";

// Requires the persistent follow deployment. Uses real stored sessions and owned fixtures.
describe("ServerFacade persisted follow API", () => {
  it("persists relationships/counts and paginates both directions using the stored actor", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      await withFollowFixture("lists", async ({ api, users: [a, b, c], tokens: [token, cToken], call }) => {
        expect(await call(() => api.follow({ token, userAlias: b.alias }))).toEqual([1, 0]);
        expect(await call(() => api.follow({ token, userAlias: c.alias }))).toEqual([1, 0]);
        expect(await call(() => api.follow({ token: cToken, userAlias: b.alias }))).toEqual([2, 0]);
        expect(await call(() => api.isFollowing({ token, followerAlias: a.alias, followeeAlias: b.alias }))).toBe(true);
        await expect(call(() => api.isFollowing({ token, followerAlias: c.alias, followeeAlias: b.alias }))).rejects.toThrow("unauthorized:");
        await expect(call(() => api.follow({ token, userAlias: a.alias }))).rejects.toThrow("bad-request:");
        await expect(call(() => api.follow({ token, userAlias: b.alias }))).rejects.toThrow("Already following");
        const request = { token, userAlias: b.alias, pageSize: 1, lastItem: null };
        // Wait for the GSI rather than assuming that it is immediately consistent.
        for (let attempt = 0; ; attempt++) {
          const [items] = await call(() => api.getMoreFollowers({ ...request, pageSize: 10 }));
          if (items.map(user => user.alias).join() === [a.alias, c.alias].join()) break;
          expect(attempt).toBeLessThan(9);
          await delay(500);
        }
        const [first, more] = await call(() => api.getMoreFollowers(request));
        expect(first[0]).toBeInstanceOf(User);
        expect(first.map(user => user.dto)).toEqual([a.dto]);
        expect(more).toBe(true);
        const [next, nextMore] = await call(() => api.getMoreFollowers({ ...request, lastItem: first[0].dto }));
        expect(next.map(user => user.dto)).toEqual([c.dto]);
        expect(nextMore).toBe(false);
        const [followees, moreFollowees] = await call(() => api.getMoreFollowees({ ...request, userAlias: a.alias }));
        expect(followees.map(user => user.dto)).toEqual([b.dto]);
        expect(moreFollowees).toBe(true);
        const [last, lastMore] = await call(() => api.getMoreFollowees({ ...request, userAlias: a.alias, lastItem: followees[0].dto }));
        expect(last.map(user => user.dto)).toEqual([c.dto]);
        expect(lastMore).toBe(false);
        expect(await call(() => api.getFolloweeCount({ token, userAlias: a.alias }))).toBe(2);
        expect(await call(() => api.unfollow({ token, userAlias: b.alias }))).toEqual([1, 0]);
        expect(await call(() => api.isFollowing({ token, followerAlias: a.alias, followeeAlias: b.alias }))).toBe(false);
        await expect(call(() => api.unfollow({ token, userAlias: b.alias }))).rejects.toThrow("Not following");
        await call(() => api.logout({ token }));
        await expect(call(() => api.follow({ token, userAlias: b.alias }))).rejects.toThrow("unauthorized:");
      });
    } finally { consoleError.mockRestore(); }
  }, 180000);
});
