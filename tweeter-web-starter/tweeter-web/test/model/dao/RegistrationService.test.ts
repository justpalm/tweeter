/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { compare, getRounds } from "../../../../tweeter-server/node_modules/bcryptjs";
import { User } from "tweeter-shared";
import type { DAOFactory } from "../../../../tweeter-server/src/model/dao/factory/DAOFactory";
import type { StoredImage } from "../../../../tweeter-server/src/model/dao/ImageDAO";
import type { ProfileImage } from "../../../../tweeter-server/src/model/domain/ProfileImage";
import type { AuthTokenRecord } from "../../../../tweeter-server/src/model/dao/AuthTokenDAO";
import { UserService } from "../../../../tweeter-server/src/model/service/UserService";
import { AuthorizationService } from "../../../../tweeter-server/src/model/service/AuthorizationService";

const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/5ncLrgAAAABJRU5ErkJggg==";
const alias = "@registration-student";
const password = "registration-test-password";
const now = 1_000_000;

function setup() {
  const accounts = new Map<string, { user: User; passwordHash: string }>();
  const sessions = new Map<string, AuthTokenRecord>();
  const images = new Map<string, StoredImage>();
  let imageNumber = 0;
  const upload = jest.fn<(image: ProfileImage) => Promise<StoredImage>>().mockImplementation(async () => {
    const image = { id: `opaque-image-${++imageNumber}`, url: `https://images.example/${imageNumber}.png` };
    images.set(image.id, image);
    return image;
  });
  const remove = jest.fn<(id: string) => Promise<void>>().mockImplementation(async id => { images.delete(id); });
  const lookup = jest.fn<(alias: string) => Promise<User | null>>()
    .mockImplementation(async name => accounts.get(name)?.user ?? null);
  const createUser = jest.fn<(user: User, passwordHash: string) => Promise<boolean>>().mockImplementation(async (user, hash) => {
    if (accounts.has(user.alias)) return false;
    accounts.set(user.alias, { user, passwordHash: hash });
    return true;
  });
  const createSession = jest.fn<(session: AuthTokenRecord) => Promise<boolean>>().mockImplementation(async session => {
    if (sessions.has(session.token)) return false;
    sessions.set(session.token, session);
    return true;
  });
  const factory: DAOFactory = {
    getFollowDAO: () => { throw new Error("Unexpected follow DAO request"); },
    getUserDAO: () => ({ createUser, getUserByAlias: lookup,
      getPasswordHash: async name => accounts.get(name)?.passwordHash ?? null }),
    getImageDAO: () => ({ uploadImage: upload, deleteImage: remove }),
    getAuthTokenDAO: () => ({ createAuthToken: createSession,
      getAuthToken: async token => sessions.get(token) ?? null,
      updateLastActiveTimestamp: async (token, timestamp) => {
        const session = sessions.get(token);
        if (!session) return false;
        sessions.set(token, { ...session, lastActiveTimestamp: Math.max(timestamp, session.lastActiveTimestamp) });
        return true;
      },
      deleteAuthToken: async token => { sessions.delete(token); },
    }),
  };
  const service = new UserService(factory);
  const register = (image = png, extension = "png", secret = password) =>
    service.register("Registration", "Student", alias, secret, image, extension);
  jest.spyOn(Date, "now").mockReturnValue(now);
  return { service, factory, register, accounts, sessions, images, upload, remove, lookup, createUser, createSession };
}

afterEach(() => { jest.restoreAllMocks(); });

describe("registration (real bcryptjs, storage-independent in-memory DAOs)", () => {
  it("hashes the password, stores the public profile/photo URL, and signs the new user in", async () => {
    const { register, factory, accounts, sessions, upload } = setup();
    const [user, token] = await register();
    const saved = accounts.get(alias)!;
    expect(user.dto).toEqual({ firstName: "Registration", lastName: "Student", alias, imageUrl: "https://images.example/1.png" });
    expect(saved.user.dto).toEqual(user.dto);
    expect(saved.passwordHash).not.toBe(password);
    expect(getRounds(saved.passwordHash)).toBe(10);
    expect(await compare(password, saved.passwordHash)).toBe(true);
    expect(await compare("wrong-password", saved.passwordHash)).toBe(false);
    expect(upload.mock.calls[0][0]).toEqual({ bytes: Buffer.from(png, "base64"), extension: "png" });
    expect(JSON.stringify(user)).not.toContain(saved.passwordHash);
    expect(sessions.get(token.token)).toEqual({ token: token.token, userAlias: alias, lastActiveTimestamp: now });
    await expect(new AuthorizationService(factory).authenticate(token.token)).resolves.toBe(alias);
  });

  it("supports a later login with the registered password", async () => {
    const { service, register } = setup();
    const [registered, first] = await register();
    const [loggedIn, second] = await service.login(alias, password);
    expect(loggedIn.dto).toEqual(registered.dto);
    expect(second.token).not.toBe(first.token);
  });

  it("rejects an existing alias before uploading or creating anything", async () => {
    const { register, lookup, upload, createUser, createSession } = setup();
    lookup.mockResolvedValue(new User("Existing", "User", alias, "existing-photo"));
    await expect(register()).rejects.toThrow("bad-request: Alias already registered");
    expect(upload).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("handles a duplicate race by deleting only the losing upload", async () => {
    const { register, accounts, images, remove, createSession } = setup();
    const results = await Promise.allSettled([register(), register()]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const failure = results.find(result => result.status === "rejected") as PromiseRejectedResult;
    expect(failure.reason.message).toBe("bad-request: Alias already registered");
    expect(accounts.size).toBe(1);
    expect(images.size).toBe(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect([...images.values()][0].url).toBe(accounts.get(alias)!.user.imageUrl);
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it("reports cleanup failure without issuing a session", async () => {
    const { register, createUser, remove, createSession } = setup();
    createUser.mockResolvedValue(false);
    const error = new Error("delete unavailable");
    remove.mockRejectedValue(error);
    await expect(register()).rejects.toMatchObject({
      message: "internal-server-error: Duplicate registration image cleanup failed", cause: error,
    });
    expect(remove).toHaveBeenCalledWith("opaque-image-1");
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each(["lookup", "upload", "account"])("propagates %s failures without creating a session", async operation => {
    const { register, lookup, upload, createUser, remove, createSession, images } = setup();
    const error = new Error("storage unavailable");
    if (operation === "lookup") lookup.mockRejectedValue(error);
    if (operation === "upload") upload.mockRejectedValue(error);
    if (operation === "account") createUser.mockRejectedValue(error);
    await expect(register()).rejects.toBe(error);
    expect(createSession).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled(); // An account-write error may have committed.
    expect(images.size).toBe(operation === "account" ? 1 : 0);
    if (operation !== "account") expect(createUser).not.toHaveBeenCalled();
  });

  it("keeps the created account/photo when session persistence fails, allowing login", async () => {
    const { register, service, createSession, accounts, images, remove } = setup();
    createSession.mockRejectedValueOnce(new Error("session write failed"));
    await expect(register()).rejects.toThrow("session write failed");
    expect(accounts.has(alias)).toBe(true);
    expect(images.size).toBe(1);
    expect(remove).not.toHaveBeenCalled();
    await expect(service.login(alias, password)).resolves.toEqual([expect.any(User), expect.anything()]);
  });

  it.each([["not base64", "png"], [png, "svg"], [png, "jpg"], ["", "png"]])(
    "rejects invalid image inputs before uploading", async (image, extension) => {
      const { register, upload, createUser } = setup();
      await expect(register(image, extension)).rejects.toThrow(/^bad-request:/);
      expect(upload).not.toHaveBeenCalled();
      expect(createUser).not.toHaveBeenCalled();
    },
  );

  it("measures the bcrypt limit in UTF-8 bytes before hashing/uploading", async () => {
    const { register, upload, createUser } = setup();
    await expect(register(png, "png", "é".repeat(37))).rejects.toThrow("72 UTF-8 bytes");
    expect(upload).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });
});
