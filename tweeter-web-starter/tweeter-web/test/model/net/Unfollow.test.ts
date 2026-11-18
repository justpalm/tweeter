/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { AuthToken, FakeData, User, UnfollowRequest } from "tweeter-shared";
import { handler } from "../../../../tweeter-server/src/lambda/follow/UnfollowLambda";
import { FollowService as ServerFollowService } from "../../../../tweeter-server/src/model/service/FollowService";
import { FollowService } from "../../../src/model.service/FollowService";
import { ServerFacade } from "../../../src/model/net/ServerFacade";
import { UserInfoPresenter, UserInfoView } from "../../../src/presenter/UserInfoPresenter";

const token = new AuthToken("test-token", 0);
const user = new User("Amy", "Ames", "@amy", "image-url");
const request: UnfollowRequest = { token: "test-token", userAlias: "@amy" };

afterEach(() => {
  jest.restoreAllMocks();
});

describe("unfollow client/server contract", () => {
  it.each([[7, 3], [0, 0]])(
    "returns counts %i/%i through one JSON POST and the real handler/service",
    async (followerCount, followeeCount) => {
      const unfollow = jest.spyOn(ServerFollowService.prototype, "unfollow");
      const followers = jest.spyOn(FakeData.instance, "getFollowerCount").mockReturnValue(followerCount);
      const followees = jest.spyOn(FakeData.instance, "getFolloweeCount").mockReturnValue(followeeCount);
      const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        expect(url).toBe("https://we8tshfgt5.execute-api.us-east-2.amazonaws.com/prod/lambda/unfollow");
        expect(init?.method).toBe("POST");
        expect(new Headers(init?.headers).get("Content-type")).toBe("application/json");
        const body = JSON.parse(init?.body as string);
        expect(body).toEqual(request);
        const response = JSON.parse(JSON.stringify(await handler(body)));
        expect(response).toEqual({ success: true, message: null, followerCount, followeeCount });
        return new Response(JSON.stringify(response));
      });

      await expect(new FollowService().unfollow(token, user)).resolves.toEqual([followerCount, followeeCount]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(unfollow).toHaveBeenCalledWith("test-token", "@amy");
      expect(followers).toHaveBeenCalledWith("@amy");
      expect(followees).toHaveBeenCalledWith("@amy");
    },
  );

  it("propagates a service failure instead of returning success", async () => {
    jest.spyOn(ServerFollowService.prototype, "unfollow").mockRejectedValue(
      new Error("internal-server-error: unfollow failed"),
    );
    await expect(handler(request)).rejects.toThrow("internal-server-error: unfollow failed");
  });

  it.each(["User not found", null])("propagates API failure with message %s", async (message) => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: false, message,
    })));
    await expect(new FollowService().unfollow(token, user)).rejects.toThrow(message ?? "Failed to unfollow user");
  });

  it.each(["followerCount", "followeeCount"])("rejects malformed %s", async (field) => {
    for (const value of ["7", -1, 1.5, null, undefined, true]) {
      jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
        success: true, message: null, followerCount: 7, followeeCount: 3, [field]: value,
      })));
      await expect(new ServerFacade().unfollow(request)).rejects.toThrow("Invalid unfollow counts returned by server");
    }
  });

  it("propagates HTTP errors", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ error: "unauthorized" }), { status: 401 },
    ));
    await expect(new FollowService().unfollow(token, user)).rejects.toThrow("unauthorized");
  });
});

describe("unfollow presenter with real client service", () => {
  it.each([true, false])("waits for the request and cleans up the toast on success=%s", async (success) => {
    let finish!: (response: Response) => void;
    const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise<Response>(resolve => { finish = resolve; }),
    );
    const view: UserInfoView = {
      setIsFollower: jest.fn(), setFollowerCount: jest.fn(), setFolloweeCount: jest.fn(),
      displayErrorMessage: jest.fn(), displayInfoMessage: jest.fn(() => "toast-id"), deleteMessage: jest.fn(),
    };
    let completed = false;
    const operation = new UserInfoPresenter(view).unfollowUser(token, user).then(() => { completed = true; });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(completed).toBe(false);
    expect(view.setIsFollower).not.toHaveBeenCalled();
    expect(view.setFollowerCount).not.toHaveBeenCalled();
    expect(view.setFolloweeCount).not.toHaveBeenCalled();
    expect(view.deleteMessage).not.toHaveBeenCalled();

    finish(new Response(JSON.stringify({
      success, message: success ? null : "User not found", followerCount: 7, followeeCount: 3,
    })));
    await operation;

    if (success) {
      expect(view.setIsFollower).toHaveBeenCalledWith(false);
      expect(view.setFollowerCount).toHaveBeenCalledWith(7);
      expect(view.setFolloweeCount).toHaveBeenCalledWith(3);
      expect(view.displayErrorMessage).not.toHaveBeenCalled();
    } else {
      expect(view.setIsFollower).not.toHaveBeenCalled();
      expect(view.setFollowerCount).not.toHaveBeenCalled();
      expect(view.setFolloweeCount).not.toHaveBeenCalled();
      expect(view.displayErrorMessage).toHaveBeenCalledWith(expect.stringContaining("User not found"));
    }
    expect(view.deleteMessage).toHaveBeenCalledWith("toast-id");
  });
});
