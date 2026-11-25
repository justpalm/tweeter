/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it } from "@jest/globals";
import { withFollowFixture } from "./helpers/liveFollowFixture";

describe("ServerFacade persisted follower count API", () => {
  it("returns exact zero/new/removed counts for the displayed profile", async () => {
    await withFollowFixture("counts", async ({ api, users: [a, b], tokens: [token], call }) => {
      const request = { token, userAlias: b.alias };
      expect(await call(() => api.getFollowerCount(request))).toBe(0);
      expect(await call(() => api.follow(request))).toEqual([1, 0]);
      expect(await call(() => api.getFollowerCount(request))).toBe(1);
      expect(await call(() => api.getFolloweeCount({ token, userAlias: a.alias }))).toBe(1);
      expect(await call(() => api.unfollow(request))).toEqual([0, 0]);
      expect(await call(() => api.getFollowerCount(request))).toBe(0);
    });
  }, 120000);
});
