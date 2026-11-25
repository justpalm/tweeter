/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { AuthToken, GetUserRequest, User } from "tweeter-shared";
import { handler } from "../../../../tweeter-server/src/lambda/user/GetUserLambda";
import { UserService as ServerUserService } from "../../../../tweeter-server/src/model/service/UserService";
import { UserService } from "../../../src/model.service/UserService";
import { ServerFacade } from "../../../src/model/net/ServerFacade";
import { AWSDAOFactory } from "../../../../tweeter-server/src/model/dao/factory/AWSDAOFactory";

const request: GetUserRequest = { token: "get-user-token", alias: "@allen" };
const expectedUser = {
  firstName: "Allen", lastName: "Anderson", alias: "@allen",
  imageUrl: "https://faculty.cs.byu.edu/~jwilkerson/cs340/tweeter/images/donald_duck.png",
};

afterEach(() => { jest.restoreAllMocks(); });

describe("getUser client/server contract", () => {
  it.each(["@allen", "@unknown-get-user-alias"])("retrieves %s through the real local layers and JSON", async alias => {
    const lookup = jest.fn<(alias: string) => Promise<User | null>>()
      .mockResolvedValue(alias === "@allen" ? User.fromDto(expectedUser) : null);
    jest.spyOn(AWSDAOFactory.prototype, "getUserDAO").mockReturnValue({
      createUser: async () => true, getPasswordHash: async () => null, getUserByAlias: lookup,
    });
    const getUser = jest.spyOn(ServerUserService.prototype, "getUser");
    const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      expect(url).toBe("https://we8tshfgt5.execute-api.us-east-2.amazonaws.com/prod/lambda/user/get");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("Content-type")).toBe("application/json");
      const body = JSON.parse(init?.body as string);
      expect(body).toEqual({ token: request.token, alias });
      const response = JSON.parse(JSON.stringify(await handler(body)));
      expect(response).toEqual({ success: true, message: null, user: alias === "@allen" ? expectedUser : null });
      return new Response(JSON.stringify(response));
    });
    const user = await new UserService().getUser(new AuthToken(request.token, 123456), alias);
    expect(getUser).toHaveBeenCalledWith(request.token, alias);
    expect(lookup).toHaveBeenCalledWith(alias);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    if (alias === "@allen") {
      expect(user).toBeInstanceOf(User);
      expect(user?.dto).toEqual(expectedUser);
      expect(user?.name).toBe("Allen Anderson");
    } else {
      expect(user).toBeNull();
    }
  });

  it("awaits the server service before returning its user", async () => {
    let finish!: (user: User | null) => void;
    const getUser = jest.spyOn(ServerUserService.prototype, "getUser")
      .mockImplementation(() => new Promise<User | null>(resolve => { finish = resolve; }));
    let completed = false;
    const result = handler(request).then(response => { completed = true; return response; });
    expect(getUser).toHaveBeenCalledWith(request.token, request.alias);
    await Promise.resolve();
    expect(completed).toBe(false);
    finish(User.fromDto(expectedUser));
    await expect(result).resolves.toEqual({ success: true, message: null, user: expectedUser });
  });

  it("propagates server failures instead of returning an unknown user", async () => {
    jest.spyOn(ServerUserService.prototype, "getUser").mockRejectedValue(new Error("internal-server-error: lookup failed"));
    await expect(handler(request)).rejects.toThrow("internal-server-error: lookup failed");
  });

  it.each(["Lookup failed", null])("propagates application failure with message %s", async message => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: false, message, user: null })));
    await expect(new ServerFacade().getUser(request)).rejects.toThrow(message ?? "Failed to get user");
  });

  it.each([
    undefined,
    {},
    { ...expectedUser, firstName: 1 },
    { ...expectedUser, lastName: null },
    { ...expectedUser, alias: "" },
    { ...expectedUser, alias: 1 },
    { ...expectedUser, imageUrl: null },
  ])("rejects malformed success data %j", async user => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, message: null, user })));
    await expect(new ServerFacade().getUser(request)).rejects.toThrow("Invalid user data returned by server");
  });

  it("propagates HTTP errors through the client service", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ error: "unauthorized: invalid token" }), { status: 401 },
    ));
    await expect(new UserService().getUser(new AuthToken(request.token, 123456), request.alias))
      .rejects.toThrow("unauthorized: invalid token");
  });

  it("propagates network errors through the client service", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network unavailable"));
    await expect(new UserService().getUser(new AuthToken(request.token, 123456), request.alias))
      .rejects.toThrow("Network unavailable");
  });
});
