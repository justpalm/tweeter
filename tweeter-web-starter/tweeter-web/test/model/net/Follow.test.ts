/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { AuthToken, FakeData, User } from "tweeter-shared";
import { handler } from "../../../../tweeter-server/src/lambda/follow/FollowLambda";
import { FollowService } from "../../../src/model.service/FollowService";
import { ServerFacade } from "../../../src/model/net/ServerFacade";
import { UserInfoPresenter, UserInfoView } from "../../../src/presenter/UserInfoPresenter";

const token = new AuthToken("test-token", 0);
const user = new User("Amy", "Ames", "@amy", "image-url");
const request = { token: "test-token", userAlias: "@amy" };


// // Watches the function, but still executes it
// jest.spyOn(globalThis, "fetch");

// // Watches AND replaces the function's behavior
// jest.spyOn(globalThis, "fetch")
//   .mockResolvedValue(new Response("Fake response"));

afterEach(() => {
  jest.restoreAllMocks();
});

describe("follow client/server contract", () => {
  it.each([[7, 3], [0, 0]])("returns count tuple %i/%i through one JSON POST", async (followerCount, followeeCount) => {
    
    //Return the follower and followee counts from the FakeData singleton, so that we can verify that the request is correct and that the response is correctly parsed.
    jest.spyOn(FakeData.instance, "getFollowerCount").mockReturnValue(followerCount);
    jest.spyOn(FakeData.instance, "getFolloweeCount").mockReturnValue(followeeCount);

    // we are returnign our own response from the server lambda, so we can check that the request is correct
    const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(
      async (url, init) => {
      expect(url).toBe("https://we8tshfgt5.execute-api.us-east-2.amazonaws.com/prod/lambda/follow");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("Content-type")).toBe("application/json");
      const body = JSON.parse(init?.body as string);
      expect(body).toEqual(request);
      return new Response(JSON.stringify(await handler(body)));
    });

    await expect(new FollowService().follow(token, user)).resolves.toEqual([followerCount, followeeCount]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("propagates an unsuccessful API response", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: false, message: "User not found",
    })));
    await expect(new FollowService().follow(token, user)).rejects.toThrow("User not found");
  });

  it.each(["followerCount", "followeeCount"])("rejects invalid %s values", async (field) => {
    for (const value of ["7", -1, 1.5, null, undefined]) {
      jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({

        //the field is a computed property name, so we can set it to different invalid values in the loop
        // as well as the value 
        success: true, message: null, followerCount: 7, followeeCount: 3, [field]: value,
      })));
      await expect(new ServerFacade().follow(request)).rejects.toThrow("Invalid follow counts");
    }
  });

  it("propagates HTTP errors", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ error: "unauthorized" }), { status: 401 },
    ));
    await expect(new FollowService().follow(token, user)).rejects.toThrow("unauthorized");
  });
});

describe("follow presenter with real client service", () => {
  it.each([true, false])("waits for the request and cleans up the toast on success=%s", async (success) => {
    let finish!: (response: Response) => void;
    jest.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; }));
    const view: UserInfoView = {
      setIsFollower: jest.fn(), setFollowerCount: jest.fn(), setFolloweeCount: jest.fn(),
      displayErrorMessage: jest.fn(), displayInfoMessage: jest.fn(() => "toast-id"), deleteMessage: jest.fn(),
    };
    let completed = false;
    const operation = new UserInfoPresenter(view).followUser(token, user).then(() => { completed = true; });

    //False because the operation is still pending, and the view methods should not have been called yet
    expect(completed).toBe(false);
    expect(view.setIsFollower).not.toHaveBeenCalled();
    expect(view.deleteMessage).not.toHaveBeenCalled();

    finish(new Response(JSON.stringify({success, message: success ? null : "User not found", followerCount: 7, followeeCount: 3})));
    await operation;

    if (success) {
      expect(view.setIsFollower).toHaveBeenCalledWith(true);
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
