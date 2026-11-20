/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it } from "@jest/globals";
import { AuthToken, Status, User } from "tweeter-shared";
import { StatusService } from "../../../src/model.service/StatusService";

// Uses the deployed API. Milestone 3 accepts a dummy token.
describe("StatusService story API integration", () => {
  it("retrieves the expected first story page", async () => {
    const token = new AuthToken("milestone-3-dummy-token", Date.now());
    const [items, hasMore] = await new StatusService().loadMoreStoryItems(
      token, "@allen", 2, null,
    );

    expect(items).toHaveLength(2);
    expect(hasMore).toBe(true);
    expect(items[0]).toBeInstanceOf(Status);
    expect(items[0].user).toBeInstanceOf(User);
    expect(items[0].post).toBe(
      "Post 0 0\n        My friend @amy likes this website: http://byu.edu. Do you? \n        Or do you prefer this one: http://cs.byu.edu?",
    );
    expect(items[0].user.alias).toBe("@allen");
    expect(items[0].timestamp).toBe(0);
    expect(items[1].post.startsWith("Post 0 1\n")).toBe(true);
    expect(items[1].user.alias).toBe("@amy");
  }, 30000);
});
