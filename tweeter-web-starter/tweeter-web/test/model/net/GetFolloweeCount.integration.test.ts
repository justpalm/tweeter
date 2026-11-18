/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it } from "@jest/globals";
import { ServerFacade } from "../../../src/model/net/ServerFacade";

// Requires GetFolloweeCountLambda and its endpoint to be deployed to prod.
describe("ServerFacade followee count API integration", () => {
  it("returns an integer count in the Milestone 3 dummy-data range", async () => {
    const count = await new ServerFacade().getFolloweeCount({
      token: "milestone-3-dummy-token",
      userAlias: "@allen",
    });

    expect(Number.isInteger(count)).toBe(true);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(10);
  }, 30000);
});
