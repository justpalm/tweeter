/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import crypto from "node:crypto";
import { hashSync } from "../../../../tweeter-server/node_modules/bcryptjs";
import { AuthToken, User } from "tweeter-shared";
import type { AuthTokenRecord } from "../../../../tweeter-server/src/model/dao/AuthTokenDAO";
import type { DAOFactory } from "../../../../tweeter-server/src/model/dao/factory/DAOFactory";
import { UserService } from "../../../../tweeter-server/src/model/service/UserService";
import { AuthorizationService } from "../../../../tweeter-server/src/model/service/AuthorizationService";

const user = new User("Login", "Student", "@login-student", "https://example.com/login.png");
const password = "test-password";
const passwordHash = hashSync(password, 4); // Low cost only for local test fixtures.
const now = 1_000_000;

function setup() {
  const sessions = new Map<string, AuthTokenRecord>();
  const readHash = jest.fn<(alias: string) => Promise<string | null>>().mockResolvedValue(passwordHash);
  const readUser = jest.fn<(alias: string) => Promise<User | null>>().mockResolvedValue(user);
  const create = jest.fn<(record: AuthTokenRecord) => Promise<boolean>>().mockImplementation(async record => {
    if (sessions.has(record.token)) return false;
    sessions.set(record.token, record);
    return true;
  });
  const factory: DAOFactory = {
    getImageDAO: () => { throw new Error("Login must not request image storage"); },
    getUserDAO: () => ({ createUser: async () => true, getPasswordHash: readHash, getUserByAlias: readUser }),
    getAuthTokenDAO: () => ({
      createAuthToken: create,
      getAuthToken: async token => sessions.get(token) ?? null,
      updateLastActiveTimestamp: async (token, timestamp) => {
        const stored = sessions.get(token);
        if (!stored) return false;
        sessions.set(token, { ...stored, lastActiveTimestamp: Math.max(timestamp, stored.lastActiveTimestamp) });
        return true;
      },
      deleteAuthToken: async token => { sessions.delete(token); },
    }),
  };
  jest.spyOn(Date, "now").mockReturnValue(now);
  return { service: new UserService(factory), factory, sessions, readHash, readUser, create };
}

afterEach(() => { jest.restoreAllMocks(); });

describe("login credentials and persisted sessions (local DAOs, real bcryptjs)", () => {
  it("returns the stored public user and persists server-generated owner/time", async () => {
    const { service, sessions, readHash, readUser, create } = setup();
    const [returnedUser, token] = await service.login(user.alias, password);
    expect(readHash).toHaveBeenCalledWith(user.alias);
    expect(readUser).toHaveBeenCalledWith(user.alias);
    expect(returnedUser).toBe(user);
    expect(token).toBeInstanceOf(AuthToken);
    expect(token.token).toMatch(/^[0-9a-f]{64}$/);
    expect(token.timestamp).toBe(now);
    expect(sessions.get(token.token)).toEqual({ token: token.token, userAlias: user.alias, lastActiveTimestamp: now });
    expect(create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify([returnedUser, token])).not.toContain(passwordHash);
  });

  it("issues independent sessions for successive logins", async () => {
    const { service, sessions } = setup();
    const [, first] = await service.login(user.alias, password);
    const [, second] = await service.login(user.alias, password);
    expect(first.token).not.toBe(second.token);
    expect(sessions.size).toBe(2);
  });

  it.each(["missing alias", "wrong password"])("rejects %s with the same error and no session", async scenario => {
    const { service, readHash, readUser, create } = setup();
    if (scenario === "missing alias") readHash.mockResolvedValue(null);
    await expect(service.login(user.alias, scenario === "wrong password" ? "incorrect" : password))
      .rejects.toThrow("unauthorized: Invalid alias or password");
    expect(readUser).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("does not trim or normalize the submitted password", async () => {
    const { service, create } = setup();
    await expect(service.login(user.alias, ` ${password} `)).rejects.toThrow(/^unauthorized:/);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects passwords over bcrypt's 72-byte limit rather than ignoring a suffix", async () => {
    const { service, readHash, create } = setup();
    await expect(service.login(user.alias, "é".repeat(37))).rejects.toThrow(/^unauthorized:/);
    expect(readHash).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a missing profile before issuing a session", async () => {
    const { service, readUser, create } = setup();
    readUser.mockResolvedValue(null);
    await expect(service.login(user.alias, password)).rejects.toThrow("internal-server-error: User profile unavailable");
    expect(create).not.toHaveBeenCalled();
  });

  it.each(["hash", "profile", "session"])("propagates %s storage failures without successful issuance", async operation => {
    const { service, readHash, readUser, create, sessions } = setup();
    const error = new Error("storage unavailable");
    if (operation === "hash") readHash.mockRejectedValue(error);
    if (operation === "profile") readUser.mockRejectedValue(error);
    if (operation === "session") create.mockRejectedValue(error);
    await expect(service.login(user.alias, password)).rejects.toBe(error);
    expect(sessions.size).toBe(0);
    expect(create).toHaveBeenCalledTimes(operation === "session" ? 1 : 0);
  });

  it("waits for the write to succeed before returning login data", async () => {
    const { service, create } = setup();
    let release!: (created: boolean) => void;
    let entered!: () => void;
    const writeStarted = new Promise<void>(resolve => { entered = resolve; });
    create.mockImplementation(() => {
      entered();
      return new Promise<boolean>(resolve => { release = resolve; });
    });
    let returned = false;
    const login = service.login(user.alias, password).then(result => { returned = true; return result; });
    await writeStarted;
    expect(returned).toBe(false);
    release(true);
    await expect(login).resolves.toEqual([user, expect.any(AuthToken)]);
  });

  it("retries a collision without overwriting its existing owner", async () => {
    const { service, sessions, create } = setup();
    const collision = "01".repeat(32);
    const original = { token: collision, userAlias: "@another-user", lastActiveTimestamp: now - 500 };
    sessions.set(collision, original);
    jest.spyOn(crypto, "randomBytes")
      .mockImplementationOnce((() => Buffer.alloc(32, 1)) as typeof crypto.randomBytes)
      .mockImplementationOnce((() => Buffer.alloc(32, 2)) as typeof crypto.randomBytes);
    const [, token] = await service.login(user.alias, password);
    expect(token.token).toBe("02".repeat(32));
    expect(sessions.get(collision)).toEqual(original);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("stops after three collisions", async () => {
    const { service, create } = setup();
    create.mockResolvedValue(false);
    await expect(service.login(user.alias, password)).rejects.toThrow("internal-server-error: Unable to create session");
    expect(create).toHaveBeenCalledTimes(3);
  });

  it("fails on secure generator failure without a fallback or write", async () => {
    const { service, create } = setup();
    jest.spyOn(crypto, "randomBytes").mockImplementation(() => { throw new Error("random source unavailable"); });
    await expect(service.login(user.alias, password)).rejects.toThrow("random source unavailable");
    expect(create).not.toHaveBeenCalled();
  });

  it("authenticates, refreshes, and logs out an issued session", async () => {
    const { service, factory, sessions } = setup();
    const [, token] = await service.login(user.alias, password);
    jest.spyOn(Date, "now").mockReturnValue(now + 1000);
    await expect(new AuthorizationService(factory).authenticate(token.token)).resolves.toBe(user.alias);
    expect(sessions.get(token.token)?.lastActiveTimestamp).toBe(now + 1000);
    await expect(service.getUser(token.token, user.alias)).resolves.toBe(user);
    await service.logout(token.token);
    expect(sessions.has(token.token)).toBe(false);
    await expect(service.getUser(token.token, user.alias)).rejects.toThrow(/^unauthorized:/);
  });
});
