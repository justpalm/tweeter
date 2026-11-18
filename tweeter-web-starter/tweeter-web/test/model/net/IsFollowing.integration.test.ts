/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it } from "@jest/globals";
import { ServerFacade } from "../../../src/model/net/ServerFacade";

// Requires IsFollowingLambda and its endpoint to be deployed to prod.
describe("ServerFacade isFollowing API integration", () => {
  it("returns a boolean from the deployed Milestone 3 dummy-data service", async () => {
    const isFollowing = await new ServerFacade().isFollowing({
      token: "milestone-3-dummy-token",
      followerAlias: "@allen",
      followeeAlias: "@amy",
    });

    // The dummy service is random; exact true/false cases are covered locally.
    expect(typeof isFollowing).toBe("boolean");
  }, 30000);
});
