/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { AuthTokenRecord } from "../../../../tweeter-server/src/model/dao/AuthTokenDAO";
import type { DAOFactory } from "../../../../tweeter-server/src/model/dao/factory/DAOFactory";
import { AuthorizationService } from "../../../../tweeter-server/src/model/service/AuthorizationService";
import { UserService } from "../../../../tweeter-server/src/model/service/UserService";

const now = 1_000_000;
const session = { token: "stored-token", userAlias: "@stored-owner", lastActiveTimestamp: now - 1000 };
function setup() {
  const read = jest.fn<(token: string) => Promise<AuthTokenRecord | null>>().mockResolvedValue(session);
  const refresh = jest.fn<(token: string, timestamp: number) => Promise<boolean>>().mockResolvedValue(true);
  const remove = jest.fn<(token: string) => Promise<void>>().mockResolvedValue(undefined);
  const lookup = jest.fn<() => Promise<null>>().mockResolvedValue(null);
  const factory: DAOFactory = {
    getStoryDAO: () => { throw new Error("Unexpected story DAO request"); },
    getFeedDAO: () => { throw new Error("Unexpected feed DAO request"); },
    getFollowDAO: () => { throw new Error("Unexpected follow DAO request"); },
    getImageDAO: () => { throw new Error("Authorization must not request image storage"); },
    getAuthTokenDAO: () => ({ createAuthToken: async () => true, getAuthToken: read,
      updateLastActiveTimestamp: refresh, deleteAuthToken: remove }),
    getUserDAO: () => ({ createUser: async () => true, getPasswordHash: async () => null, getUserByAlias: lookup }),
  };
  return { auth: new AuthorizationService(factory, () => now), userService: new UserService(factory), read, refresh, remove, lookup };
}
afterEach(() => { jest.restoreAllMocks(); });

describe("AuthorizationService (local mocked DAOs)", () => {
  it.each([0, 59_999])("accepts %i ms of inactivity and refreshes using server time", async age => {
    const { auth, read, refresh } = setup();
    read.mockResolvedValue({ ...session, lastActiveTimestamp: now - age });
    await expect(auth.authenticate(session.token)).resolves.toBe("@stored-owner");
    expect(read).toHaveBeenCalledWith(session.token);
    expect(refresh).toHaveBeenCalledWith(session.token, now);
  });

  it.each([60_000, 60_001, -1])("rejects activity age %i before refreshing", async age => {
    const { auth, read, refresh } = setup();
    read.mockResolvedValue({ ...session, lastActiveTimestamp: now - age });
    await expect(auth.authenticate(session.token)).rejects.toThrow(/^unauthorized:/);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("rejects a missing session without refreshing", async () => {
    const { auth, read, refresh } = setup();
    read.mockResolvedValue(null);
    await expect(auth.authenticate(session.token)).rejects.toThrow(/^unauthorized:/);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("rejects blank tokens without accessing storage", async () => {
    const { auth, read } = setup();
    await expect(auth.authenticate(" ")).rejects.toThrow(/^unauthorized:/);
    expect(read).not.toHaveBeenCalled();
  });

  it("rejects a session deleted between reading and refreshing", async () => {
    const { auth, refresh } = setup();
    refresh.mockResolvedValue(false);
    await expect(auth.authenticate(session.token)).rejects.toThrow(/^unauthorized:/);
  });

  it("propagates storage failures instead of classifying them as invalid credentials", async () => {
    const { auth, read, refresh } = setup();
    const failure = new Error("storage unavailable");
    read.mockRejectedValueOnce(failure);
    await expect(auth.authenticate(session.token)).rejects.toBe(failure);
    expect(refresh).not.toHaveBeenCalled();
    refresh.mockRejectedValueOnce(failure);
    await expect(auth.authenticate(session.token)).rejects.toBe(failure);
  });
});

describe("UserService session integration", () => {
  it("rejects expired lookup and logout before profile access or deletion", async () => {
    jest.spyOn(Date, "now").mockReturnValue(now);
    const { userService, read, lookup, remove, refresh } = setup();
    read.mockResolvedValue({ ...session, lastActiveTimestamp: now - 60_000 });
    await expect(userService.getUser(session.token, "@someone-else")).rejects.toThrow(/^unauthorized:/);
    await expect(userService.logout(session.token)).rejects.toThrow(/^unauthorized:/);
    expect(lookup).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("allows an authenticated lookup of another profile and refreshes first", async () => {
    jest.spyOn(Date, "now").mockReturnValue(now);
    const { userService, lookup, refresh } = setup();
    await expect(userService.getUser(session.token, "@someone-else")).resolves.toBeNull();
    expect(lookup).toHaveBeenCalledWith("@someone-else");
    expect(refresh.mock.invocationCallOrder[0]).toBeLessThan(lookup.mock.invocationCallOrder[0]);
  });

  it("deletes the authenticated token on logout and propagates deletion failures", async () => {
    jest.spyOn(Date, "now").mockReturnValue(now);
    const { userService, remove } = setup();
    await expect(userService.logout(session.token)).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith(session.token);
    const failure = new Error("delete unavailable");
    remove.mockRejectedValueOnce(failure);
    await expect(userService.logout(session.token)).rejects.toBe(failure);
  });
});
