/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { FakeData, FollowRequest } from "tweeter-shared";
import { handler } from "../../../../tweeter-server/src/lambda/follow/FollowLambda";
import { FollowService } from "../../../../tweeter-server/src/model/service/FollowService";

const request: FollowRequest = { token: "test-token", userAlias: "@amy" };

afterEach(() => {
  jest.restoreAllMocks();
});

describe("follow Lambda and server service", () => {


// .prototype is where regular class methods are stored.
// Instances of the class can use those methods through prototype inheritance.
// Mocking a method on .prototype can affect all instances that inherit that method.


  it.each([[7, 3], [0, 0]])(
    "passes JSON token/alias to the service and returns counts %i/%i",
    async (followerCount, followeeCount) => {
      const follow = jest.spyOn(FollowService.prototype, "follow");
      const followers = jest.spyOn(FakeData.instance, "getFollowerCount").mockReturnValue(followerCount);
      const followees = jest.spyOn(FakeData.instance, "getFolloweeCount").mockReturnValue(followeeCount);

      const response = await handler(JSON.parse(JSON.stringify(request)));

      expect(follow).toHaveBeenCalledWith("test-token", "@amy");
      expect(followers).toHaveBeenCalledWith("@amy");
      expect(followees).toHaveBeenCalledWith("@amy");
      expect(JSON.parse(JSON.stringify(response))).toEqual({
        success: true, message: null, followerCount, followeeCount,
      });
    },
  );

  it("propagates a service failure instead of returning success", async () => {
    jest.spyOn(FollowService.prototype, "follow").mockRejectedValue(
      new Error("internal-server-error: follow failed"),
    );

    await expect(handler(request)).rejects.toThrow("internal-server-error: follow failed");
  });
});
