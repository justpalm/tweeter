/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it } from "@jest/globals";
import { Status, Type, User } from "tweeter-shared";
import { StatusService } from "../../../src/model.service/StatusService";
import { UserService } from "../../../src/model.service/UserService";

// Requires LoadMoreStoryItemsLambda and POST /lambda/story/list deployed to prod.
describe("StatusService story live API integration", () => {
  it("retrieves expected dummy story pages and reconstructs statuses and authors", async () => {
    const [, token] = await new UserService().login("@student", "test-password");
    const service = new StatusService();
    const [first, moreFirst] = await service.loadMoreStoryItems(token, "@allen", 2, null);
    expect(first).toHaveLength(2);
    expect(moreFirst).toBe(true);
    expect(first[0]).toBeInstanceOf(Status);
    expect(first[0].user).toBeInstanceOf(User);
    expect(first[0].dto).toEqual({
      post: "Post 0 0\n        My friend @amy likes this website: http://byu.edu. Do you? \n        Or do you prefer this one: http://cs.byu.edu?",
      user: {
        firstName: "Allen", lastName: "Anderson", alias: "@allen",
        imageUrl: "https://faculty.cs.byu.edu/~jwilkerson/cs340/tweeter/images/donald_duck.png",
      },
      timestamp: 0,
    });
    expect(first[0].segments.some(segment => segment.type === Type.alias)).toBe(true);
    expect(first[1].post.startsWith("Post 0 1\n")).toBe(true);
    expect(first[1].user.alias).toBe("@amy");
    expect(first[1].timestamp).toBe(30000000000);

    const [second, moreSecond] = await service.loadMoreStoryItems(token, "@allen", 2, first[1]);
    expect(second).toHaveLength(2);
    expect(moreSecond).toBe(true);
    expect(second[0]).toBeInstanceOf(Status);
    expect(second[0].user).toBeInstanceOf(User);
    expect(second[0].post.startsWith("Post 0 2\n")).toBe(true);
    expect(second[0].user.alias).toBe("@bob");
    expect(second[0].timestamp).toBe(60000000000);
    expect(second[1].post.startsWith("Post 0 3\n")).toBe(true);
    expect(second[1].user.alias).toBe("@bonnie");
    expect(second[1].timestamp).toBe(90000000000);
    expect(first.some(item => second.some(next => next.equals(item)))).toBe(false);
  }, 30000);
});
