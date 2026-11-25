/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { AuthToken, User } from "tweeter-shared";
import { handler } from "../../../../tweeter-server/src/lambda/follow/UnfollowLambda";
import { FollowService as ServerFollowService } from "../../../../tweeter-server/src/model/service/FollowService";
import { FollowService } from "../../../src/model.service/FollowService";
import { ServerFacade } from "../../../src/model/net/ServerFacade";

const token = new AuthToken("test-token", 0);
const user = new User("Amy", "Ames", "@amy", "image-url");
const request = { token: "test-token", userAlias: "@amy" };

afterEach(() => { jest.restoreAllMocks(); });

describe("unfollow local client/server path", () => {
  it.each([[7, 3], [0, 0]])("returns follower/followee counts %i/%i through JSON", async (followerCount, followeeCount) => {
    const unfollow = jest.spyOn(ServerFollowService.prototype, "unfollow").mockResolvedValue([followerCount, followeeCount]);
    jest.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      expect(url).toBe("https://we8tshfgt5.execute-api.us-east-2.amazonaws.com/prod/lambda/unfollow");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body).toEqual(request);
      return new Response(JSON.stringify(await handler(body)));
    });
    await expect(new FollowService().unfollow(token, user)).resolves.toEqual([followerCount, followeeCount]);
    expect(unfollow).toHaveBeenCalledWith("test-token", "@amy");
  });

  it("propagates a server service failure", async () => {
    jest.spyOn(ServerFollowService.prototype, "unfollow").mockRejectedValue(new Error("unfollow failed"));
    await expect(handler(request)).rejects.toThrow("unfollow failed");
  });

  it("reports an unsuccessful API response", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: false, message: "User not found",
    })));
    await expect(new FollowService().unfollow(token, user)).rejects.toThrow("User not found");
  });

  it.each(["followerCount", "followeeCount"])("rejects a negative %s", async field => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: true, message: null, followerCount: 7, followeeCount: 3, [field]: -1,
    })));
    await expect(new ServerFacade().unfollow(request)).rejects.toThrow("Invalid unfollow counts");
  });
});
