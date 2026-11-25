/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AWSDAOFactory } from "../../../../tweeter-server/src/model/dao/factory/AWSDAOFactory";
import { handler as login } from "../../../../tweeter-server/src/lambda/user/LoginLambda";
import { handler as register } from "../../../../tweeter-server/src/lambda/user/RegisterLambda";
import { handler as logout } from "../../../../tweeter-server/src/lambda/user/LogoutLambda";
import { handler as getUser } from "../../../../tweeter-server/src/lambda/user/GetUserLambda";
import { handler as follow } from "../../../../tweeter-server/src/lambda/follow/FollowLambda";
import { handler as unfollow } from "../../../../tweeter-server/src/lambda/follow/UnfollowLambda";
import { handler as getFollowerCount } from "../../../../tweeter-server/src/lambda/follow/GetFollowerCountLambda";
import { handler as getFolloweeCount } from "../../../../tweeter-server/src/lambda/follow/GetFolloweeCountLambda";
import { handler as isFollowing } from "../../../../tweeter-server/src/lambda/follow/IsFollowingLambda";
import { handler as getFollowers } from "../../../../tweeter-server/src/lambda/follow/GetFollowersLambda";
import { handler as getFollowees } from "../../../../tweeter-server/src/lambda/follow/GetFolloweesLambda";
import { handler as loadMoreFeedItems } from "../../../../tweeter-server/src/lambda/status/LoadMoreFeedItemsLambda";
import { handler as loadMoreStoryItems } from "../../../../tweeter-server/src/lambda/status/LoadMoreStoryItemsLambda";
import { handler as postStatus } from "../../../../tweeter-server/src/lambda/status/PostStatusLambda";

const user = { firstName: "Allen", lastName: "Anderson", alias: "@allen", imageUrl: "https://example.com/a.png" };
const status = { post: "Hello @amy!\nhttps://example.com", user, timestamp: 0 };
const authenticated = { token: "test-token", userAlias: "@allen" };
const page = { ...authenticated, pageSize: 2, lastItem: null };

// This suite tests request validation, so profile/session lookups must not contact DynamoDB.
beforeEach(() => {
  jest.spyOn(AWSDAOFactory.prototype, "getAuthTokenDAO").mockReturnValue({
    createAuthToken: async () => true,
    getAuthToken: async token => ({ token, userAlias: "@allen", lastActiveTimestamp: Date.now() }),
    updateLastActiveTimestamp: async () => true,
    deleteAuthToken: async () => {},
  });
  jest.spyOn(AWSDAOFactory.prototype, "getUserDAO").mockReturnValue({
    createUser: async () => true,
    getUserByAlias: async () => null,
    getPasswordHash: async () => null,
  });
});
afterEach(() => { jest.restoreAllMocks(); });

interface Endpoint {
  name: string;
  handler: (request: never) => Promise<unknown>;
  valid: Record<string, unknown>;
}

const endpoints: Endpoint[] = [
  { name: "login", handler: login, valid: { alias: "@allen", password: "secret" } },
  { name: "register", handler: register, valid: { firstName: "Allen", lastName: "Anderson", alias: "@allen", password: "secret", imageStringBase64: "AP+A", imageFileExtension: "png" } },
  { name: "logout", handler: logout, valid: { token: "test-token" } },
  { name: "getUser", handler: getUser, valid: { token: "test-token", alias: "@allen" } },
  { name: "follow", handler: follow, valid: authenticated },
  { name: "unfollow", handler: unfollow, valid: authenticated },
  { name: "getFollowerCount", handler: getFollowerCount, valid: authenticated },
  { name: "getFolloweeCount", handler: getFolloweeCount, valid: authenticated },
  { name: "isFollowing", handler: isFollowing, valid: { token: "test-token", followerAlias: "@allen", followeeAlias: "@amy" } },
  { name: "getFollowers", handler: getFollowers, valid: page },
  { name: "getFollowees", handler: getFollowees, valid: page },
  { name: "loadMoreFeedItems", handler: loadMoreFeedItems, valid: page },
  { name: "loadMoreStoryItems", handler: loadMoreStoryItems, valid: page },
  { name: "postStatus", handler: postStatus, valid: { token: "test-token", newStatus: status } },
];

// The same two checks run for each handler listed above.
describe.each(endpoints)("$name Lambda validation", endpoint => {
  it("rejects a request with missing required fields", async () => {
    await expect(endpoint.handler({} as never)).rejects.toThrow(/^bad-request:/);
  });

  it("accepts valid JSON", async () => {
    const input = JSON.parse(JSON.stringify(endpoint.valid));
    await expect(endpoint.handler(input as never)).resolves.toMatchObject({ success: true, message: null });
  });
});

// Representative invalid values cover shared validation without nested case generators.
describe("page and status validation", () => {
  it.each([0, -1, 1.5, "2"])("rejects pageSize %s", async pageSize => {
    await expect(getFollowers({ ...page, pageSize } as never)).rejects.toThrow("bad-request:");
  });

  it.each([undefined, {}, { ...status, timestamp: -1 }, { ...status, user: null }])(
    "rejects malformed story cursors %j", async lastItem => {
      await expect(loadMoreStoryItems({ ...page, lastItem } as never)).rejects.toThrow("bad-request:");
    },
  );

  it("rejects blank post text", async () => {
    await expect(postStatus({ token: "test-token", newStatus: { ...status, post: " " } }))
      .rejects.toThrow("bad-request:");
  });
});
