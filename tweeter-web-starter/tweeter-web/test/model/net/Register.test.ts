/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { AuthToken, FakeData, RegisterRequest, User } from "tweeter-shared";
import { handler } from "../../../../tweeter-server/src/lambda/user/RegisterLambda";
import { UserService as ServerUserService } from "../../../../tweeter-server/src/model/service/UserService";
import { UserService } from "../../../src/model.service/UserService";
import { ServerFacade } from "../../../src/model/net/ServerFacade";

const request: RegisterRequest = {
  firstName: "Test", lastName: "Student", alias: "@student", password: "test-password",
  imageStringBase64: "AP+A", imageFileExtension: "png",
};
const user = new User("Allen", "Anderson", "@allen", "dummy-image-url");
const response = {
  success: true, message: null, user: user.dto, token: "server-token", timestamp: 123456,
};

afterEach(() => { jest.restoreAllMocks(); });

describe("registration client/server contract", () => {
  it.each([123456, 0])("preserves server data and timestamp %i through a JSON round trip", async timestamp => {
    jest.spyOn(FakeData.instance, "firstUser", "get").mockReturnValue(user);
    jest.spyOn(FakeData.instance, "authToken", "get").mockReturnValue(new AuthToken("server-token", timestamp));
    const register = jest.spyOn(ServerUserService.prototype, "register");
    const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      expect(url).toBe("https://we8tshfgt5.execute-api.us-east-2.amazonaws.com/prod/lambda/register");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("Content-type")).toBe("application/json");
      const body = JSON.parse(init?.body as string);
      expect(body).toEqual(request);
      expect(body).not.toHaveProperty("token");
      const result = JSON.parse(JSON.stringify(await handler(body)));
      expect(result).toEqual({ ...response, timestamp });
      return new Response(JSON.stringify(result));
    });

    const [returnedUser, token] = await new UserService().register(
      "Test", "Student", "@student", "test-password", new Uint8Array([0, 255, 128]), "png",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith("Test", "Student", "@student", "test-password", "AP+A", "png");
    expect(returnedUser).toBeInstanceOf(User);
    expect(returnedUser.dto).toEqual(user.dto);
    expect(returnedUser.name).toBe("Allen Anderson");
    expect(token).toBeInstanceOf(AuthToken);
    expect(token.token).toBe("server-token");
    expect(token.timestamp).toBe(timestamp);
  });

  it("propagates server service failures", async () => {
    jest.spyOn(ServerUserService.prototype, "register").mockRejectedValue(new Error("internal-server-error: registration failed"));
    await expect(handler(request)).rejects.toThrow("internal-server-error: registration failed");
  });

  it("rejects registration when dummy user data is unavailable", async () => {
    jest.spyOn(FakeData.instance, "firstUser", "get").mockReturnValue(null);
    await expect(handler(request)).rejects.toThrow("internal-server-error: Invalid registration");
  });

  it.each(["Alias unavailable", null])("handles application failure with message %s", async message => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: false, message, user: null, token: null, timestamp: null,
    })));
    await expect(new ServerFacade().register(request)).rejects.toThrow(message ?? "Failed to register user");
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
    await expect(new ServerFacade().register(request)).rejects.toThrow("Invalid registration data returned by server");
  });

  it("propagates HTTP failures through the client service", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ error: "bad-request: invalid registration" }), { status: 400 },
    ));
    await expect(new UserService().register(
      "Test", "Student", "@student", "test-password", new Uint8Array([0, 255, 128]), "png",
    )).rejects.toThrow("bad-request: invalid registration");
  });
});
