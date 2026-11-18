/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it } from "@jest/globals";
import { AuthToken, User } from "tweeter-shared";
import { FollowService } from "../../../src/model.service/FollowService";

// Requires FollowLambda and POST /lambda/follow to be deployed to prod.
describe("FollowService live API integration", () => {
  it("returns both counts from the deployed Milestone 3 dummy-data service", async () => {
    const counts = await new FollowService().follow(
      new AuthToken("milestone-3-dummy-token", 0),
      new User("Amy", "Ames", "@amy", "image-url"),
    );

    expect(counts).toHaveLength(2);
    for (const count of counts) {
      expect(Number.isInteger(count)).toBe(true);
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(10);
    }
  }, 30000);
});
