/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { AuthToken, FakeData, User } from "tweeter-shared";
import { handler } from "../../../../tweeter-server/src/lambda/follow/GetFollowerCountLambda";
import { FollowService } from "../../../src/model.service/FollowService";
import { ServerFacade } from "../../../src/model/net/ServerFacade";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("follower count client/server contract", () => {
  it("passes the token and alias through JSON to the handler and returns its count", async () => {
    const getCount = jest.spyOn(FakeData.instance, "getFollowerCount").mockReturnValue(7);
    const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      expect(url).toBe("https://we8tshfgt5.execute-api.us-east-2.amazonaws.com/prod/lambda/followers/count");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("Content-type")).toBe("application/json");
      const request = JSON.parse(init?.body as string);
      expect(request).toEqual({ token: "test-token", userAlias: "@allen" });
      const response = await handler(request);
      expect(response).toEqual({ success: true, message: null, count: 7 });
      return new Response(JSON.stringify(response), { status: 200 });
    });

    const count = await new FollowService().getFollowerCount(
      new AuthToken("test-token", 0),
      new User("Allen", "Anderson", "@allen", "image-url"),
    );

    expect(count).toBe(7);
    expect(getCount).toHaveBeenCalledWith("@allen");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("accepts zero followers", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, message: null, count: 0 })),
    );
    await expect(new ServerFacade().getFollowerCount({ token: "test-token", userAlias: "@allen" })).resolves.toBe(0);
  });

  it("propagates an unsuccessful API response", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: "User not found", count: 0 })),
    );
    await expect(new ServerFacade().getFollowerCount({ token: "test-token", userAlias: "@missing" })).rejects.toThrow("User not found");
  });

  it("rejects a success response without a numeric count", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, message: null, count: "7" })),
    );
    await expect(new ServerFacade().getFollowerCount({ token: "test-token", userAlias: "@allen" })).rejects.toThrow("Invalid follower count");
  });
});
