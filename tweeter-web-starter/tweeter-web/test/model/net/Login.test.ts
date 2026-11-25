/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { AuthToken, LoginRequest, User } from "tweeter-shared";
import { handler } from "../../../../tweeter-server/src/lambda/user/LoginLambda";
import { UserService as ServerUserService } from "../../../../tweeter-server/src/model/service/UserService";
import { UserService } from "../../../src/model.service/UserService";
import { ServerFacade } from "../../../src/model/net/ServerFacade";

const request: LoginRequest = {
  alias: "@student", password: "test-password",
};
const user = new User("Allen", "Anderson", "@allen", "dummy-image-url");
const response = {
  success: true, message: null, user: user.dto, token: "server-token", timestamp: 123456,
};

afterEach(() => { jest.restoreAllMocks(); });

describe("login client/server contract", () => {
  it.each([123456, 0])("preserves server data and timestamp %i through a JSON round trip", async timestamp => {
    // Contract-only mock; real credential/session behavior has separate DAO tests.
    const login = jest.spyOn(ServerUserService.prototype, "login")
      .mockResolvedValue([user, new AuthToken("server-token", timestamp)]);
    const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      expect(url).toBe("https://we8tshfgt5.execute-api.us-east-2.amazonaws.com/prod/lambda/login");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("Content-type")).toBe("application/json");
      const body = JSON.parse(init?.body as string);
      expect(body).toEqual(request);
      expect(body).not.toHaveProperty("token");
      const result = JSON.parse(JSON.stringify(await handler(body)));
      expect(result).toEqual({ ...response, timestamp });
      return new Response(JSON.stringify(result));
    });

    const [returnedUser, token] = await new UserService().login(
      "@student", "test-password",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith("@student", "test-password");
    expect(returnedUser).toBeInstanceOf(User);
    expect(returnedUser.dto).toEqual(user.dto);
    expect(returnedUser.name).toBe("Allen Anderson");
    expect(token).toBeInstanceOf(AuthToken);
    expect(token.token).toBe("server-token");
    expect(token.timestamp).toBe(timestamp);
  });

  it("propagates server service failures", async () => {
    jest.spyOn(ServerUserService.prototype, "login").mockRejectedValue(new Error("internal-server-error: login failed"));
    await expect(handler(request)).rejects.toThrow("internal-server-error: login failed");
  });

  it("propagates invalid credentials without returning login data", async () => {
    jest.spyOn(ServerUserService.prototype, "login")
      .mockRejectedValue(new Error("unauthorized: Invalid alias or password"));
    await expect(handler(request)).rejects.toThrow("unauthorized: Invalid alias or password");
  });

  it.each(["Login failed", null])("handles application failure with message %s", async message => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: false, message, user: null, token: null, timestamp: null,
    })));
    await expect(new ServerFacade().login(request)).rejects.toThrow(message ?? "Failed to log in user");
  });

  it.each([
    { user: null }, { user: undefined }, { user: {} },
    { user: { ...user.dto, firstName: 7 } },
    { user: { ...user.dto, lastName: null } },
    { user: { ...user.dto, alias: "" } },
    { user: { ...user.dto, imageUrl: false } },
    { token: null }, { token: "" }, { token: 7 },
    { timestamp: null }, { timestamp: "123456" }, { timestamp: -1 },
  ])("rejects malformed success data: %j", async invalid => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ...response, ...invalid })));
    await expect(new ServerFacade().login(request)).rejects.toThrow("Invalid login data returned by server");
  });

  it("propagates HTTP failures through the client service", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ error: "bad-request: invalid login" }), { status: 400 },
    ));
    await expect(new UserService().login(
      "@student", "test-password",
    )).rejects.toThrow("bad-request: invalid login");
  });
});
