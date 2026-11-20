/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { AuthToken, FakeData, User } from "tweeter-shared";
import { handler } from "../../../../tweeter-server/src/lambda/follow/IsFollowingLambda";
import { FollowService as ServerFollowService } from "../../../../tweeter-server/src/model/service/FollowService";
import { FollowService } from "../../../src/model.service/FollowService";
import { ServerFacade } from "../../../src/model/net/ServerFacade";

const request = {
  token: "test-token",
  followerAlias: "@allen",
  followeeAlias: "@amy",
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("isFollowing client/server contract", () => {
  it.each([true, false])("passes both aliases through JSON and returns %s", async (result) => {
    jest.spyOn(FakeData.instance, "isFollower").mockReturnValue(result);
    const serverStatus = jest.spyOn(ServerFollowService.prototype, "isFollowing");
    jest.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      expect(url).toBe("https://we8tshfgt5.execute-api.us-east-2.amazonaws.com/prod/lambda/follow/is-following");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body).toEqual(request);
      const response = await handler(body);
      expect(response).toEqual({ success: true, message: null, isFollowing: result });
      return new Response(JSON.stringify(response));
    });

    await expect(new FollowService().isFollowing(
      new AuthToken("test-token", 0),
      new User("Allen", "Anderson", "@allen", "image-url"),
      new User("Amy", "Ames", "@amy", "image-url"),
    )).resolves.toBe(result);

    expect(serverStatus).toHaveBeenCalledWith("test-token", "@allen", "@amy");
  });

  it("propagates an unsuccessful API response", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: false, message: "User not found", isFollowing: false,
    })));
    await expect(new ServerFacade().isFollowing(request)).rejects.toThrow("User not found");
  });

  it.each(["false", null])("rejects a non-boolean result: %s", async (value) => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: true, message: null, isFollowing: value,
    })));
    await expect(new ServerFacade().isFollowing(request)).rejects.toThrow("Invalid following status");
  });
});
