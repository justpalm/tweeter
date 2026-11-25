/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { AuthToken, LogoutRequest } from "tweeter-shared";
import { handler } from "../../../../tweeter-server/src/lambda/user/LogoutLambda";
import * as serverModule from "../../../../tweeter-server/src/model/service/UserService";
import { UserService } from "../../../src/model.service/UserService";
import { ServerFacade } from "../../../src/model/net/ServerFacade";
import { AWSDAOFactory } from "../../../../tweeter-server/src/model/dao/factory/AWSDAOFactory";

const request: LogoutRequest = { token: "logout-token" };

afterEach(() => { jest.restoreAllMocks(); });

describe("logout client/server contract", () => {
  it("sends only the token string and awaits the server acknowledgement through JSON", async () => {
    const remove = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    jest.spyOn(AWSDAOFactory.prototype, "getAuthTokenDAO").mockReturnValue({
      createAuthToken: async () => true,
      getAuthToken: async token => ({ token, userAlias: "@session-owner", lastActiveTimestamp: Date.now() }),
      updateLastActiveTimestamp: async () => true,
      deleteAuthToken: remove,
    });
    const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      expect(url).toBe("https://we8tshfgt5.execute-api.us-east-2.amazonaws.com/prod/lambda/logout");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("Content-type")).toBe("application/json");
      const body = JSON.parse(init?.body as string);
      expect(body).toEqual(request);
      const result = JSON.parse(JSON.stringify(await handler(body)));
      expect(result).toEqual({ success: true, message: null });
      return new Response(JSON.stringify(result));
    });
    await expect(new UserService().logout(new AuthToken(request.token, 123456))).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(request.token);
  });

  it("delegates the exact token and waits for the server service", async () => {
    const service = new serverModule.UserService(new AWSDAOFactory());
    let finish!: () => void;
    const logout = jest.spyOn(service, "logout").mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    jest.spyOn(serverModule, "UserService").mockImplementation(() => service);
    let completed = false;
    const result = handler(request).then(response => { completed = true; return response; });
    expect(logout).toHaveBeenCalledWith(request.token);
    await Promise.resolve();
    expect(completed).toBe(false);
    finish();
    await expect(result).resolves.toEqual({ success: true, message: null });
  });

  it("propagates server service failures instead of acknowledging success", async () => {
    const service = new serverModule.UserService(new AWSDAOFactory());
    jest.spyOn(service, "logout").mockRejectedValue(new Error("internal-server-error: logout failed"));
    jest.spyOn(serverModule, "UserService").mockImplementation(() => service);
    await expect(handler(request)).rejects.toThrow("internal-server-error: logout failed");
  });

  it.each(["Logout failed", null])("propagates application failure with message %s", async message => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: false, message })));
    await expect(new ServerFacade().logout(request)).rejects.toThrow(message ?? "Failed to log out user");
  });

  it("propagates HTTP failures through the client service", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ error: "unauthorized: invalid token" }), { status: 401 },
    ));
    await expect(new UserService().logout(new AuthToken(request.token, 123456)))
      .rejects.toThrow("unauthorized: invalid token");
  });

  it("propagates network failures through the client service", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network unavailable"));
    await expect(new UserService().logout(new AuthToken(request.token, 123456)))
      .rejects.toThrow("Network unavailable");
  });
});
