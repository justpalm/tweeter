/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { User } from "tweeter-shared";
import { DynamoDBDocumentClient } from "../../../../tweeter-server/node_modules/@aws-sdk/lib-dynamodb";
import { AWSDAOFactory } from "../../../../tweeter-server/src/model/dao/factory/AWSDAOFactory";
import type { DAOFactory } from "../../../../tweeter-server/src/model/dao/factory/DAOFactory";
import type { UserDAO } from "../../../../tweeter-server/src/model/dao/UserDAO";
import { DynamoUserDAO } from "../../../../tweeter-server/src/model/dao/dynamodb/DynamoUserDAO";
import { DynamoAuthTokenDAO } from "../../../../tweeter-server/src/model/dao/dynamodb/DynamoAuthTokenDAO";
import { UserService } from "../../../../tweeter-server/src/model/service/UserService";
import { S3Client } from "../../../../tweeter-server/node_modules/@aws-sdk/client-s3";
import { S3ImageDAO } from "../../../../tweeter-server/src/model/dao/s3/S3ImageDAO";

const originalTableName = process.env.USER_TABLE_NAME;
const originalAuthTableName = process.env.AUTH_TOKEN_TABLE_NAME;
const originalBucket = process.env.PROFILE_IMAGE_BUCKET_NAME;
const originalRegion = process.env.AWS_REGION;
afterEach(() => {
  jest.restoreAllMocks();
  if (originalTableName === undefined) delete process.env.USER_TABLE_NAME;
  else process.env.USER_TABLE_NAME = originalTableName;
  if (originalAuthTableName === undefined) delete process.env.AUTH_TOKEN_TABLE_NAME;
  else process.env.AUTH_TOKEN_TABLE_NAME = originalAuthTableName;
  if (originalBucket === undefined) delete process.env.PROFILE_IMAGE_BUCKET_NAME;
  else process.env.PROFILE_IMAGE_BUCKET_NAME = originalBucket;
  if (originalRegion === undefined) delete process.env.AWS_REGION;
  else process.env.AWS_REGION = originalRegion;
});

describe("AWSDAOFactory", () => {
  it("configures and caches image storage independently of the tables", async () => {
    delete process.env.USER_TABLE_NAME;
    delete process.env.AUTH_TOKEN_TABLE_NAME;
    process.env.PROFILE_IMAGE_BUCKET_NAME = "factory-photos";
    process.env.AWS_REGION = "us-east-2";
    const send = jest.spyOn(S3Client.prototype, "send").mockImplementation(async () => ({}));
    const factory = new AWSDAOFactory();
    const dao = factory.getImageDAO();
    expect(dao).toBeInstanceOf(S3ImageDAO);
    expect(factory.getImageDAO()).toBe(dao);
    await dao.deleteImage(`profile-images/${"01".repeat(32)}.png`);
    expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: "factory-photos" });
    await new AWSDAOFactory(undefined, undefined, "explicit-photos", "us-west-2")
      .getImageDAO().deleteImage(`profile-images/${"02".repeat(32)}.png`);
    expect(send.mock.calls[1][0].input).toMatchObject({ Bucket: "explicit-photos" });
  });

  it("requires image configuration only when image storage is requested", () => {
    delete process.env.PROFILE_IMAGE_BUCKET_NAME;
    delete process.env.AWS_REGION;
    const factory = new AWSDAOFactory("users", "sessions");
    expect(factory.getUserDAO()).toBeInstanceOf(DynamoUserDAO);
    expect(factory.getAuthTokenDAO()).toBeInstanceOf(DynamoAuthTokenDAO);
    expect(() => factory.getImageDAO()).toThrow("PROFILE_IMAGE_BUCKET_NAME and AWS_REGION are required");
    expect(() => new AWSDAOFactory("users", "sessions", "photos", " ").getImageDAO()).toThrow("AWS_REGION");
  });
  it("configures and reuses its token DAO independently of the user table", async () => {
    delete process.env.USER_TABLE_NAME;
    process.env.AUTH_TOKEN_TABLE_NAME = "factory-sessions";
    const send = jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async () => ({}));
    const factory = new AWSDAOFactory();
    const dao = factory.getAuthTokenDAO();
    expect(dao).toBeInstanceOf(DynamoAuthTokenDAO);
    expect(factory.getAuthTokenDAO()).toBe(dao);
    await expect(dao.getAuthToken("factory-token")).resolves.toBeNull();
    expect(send.mock.calls[0][0].input).toMatchObject({ TableName: "factory-sessions", Key: { token: "factory-token" } });
    await new AWSDAOFactory("explicit-users", "explicit-sessions").getAuthTokenDAO().getAuthToken("other-token");
    expect(send.mock.calls[1][0].input).toMatchObject({ TableName: "explicit-sessions" });
  });

  it("validates token-table configuration lazily without breaking user lookup", async () => {
    delete process.env.AUTH_TOKEN_TABLE_NAME;
    const factory = new AWSDAOFactory("factory-users");
    expect(factory.getUserDAO()).toBeInstanceOf(DynamoUserDAO);
    expect(() => factory.getAuthTokenDAO()).toThrow("AUTH_TOKEN_TABLE_NAME is required");
    expect(() => new AWSDAOFactory("factory-users", " ").getAuthTokenDAO()).toThrow("AUTH_TOKEN_TABLE_NAME is required");
  });

  it("uses the configured table and reuses its DynamoDB user DAO", async () => {
    process.env.USER_TABLE_NAME = "factory-users";
    const send = jest.spyOn(DynamoDBDocumentClient.prototype, "send")
      .mockImplementation(async () => ({}));
    const factory = new AWSDAOFactory();
    const dao = factory.getUserDAO();
    expect(dao).toBeInstanceOf(DynamoUserDAO);
    expect(factory.getUserDAO()).toBe(dao);
    await expect(dao.getUserByAlias("@factory-user")).resolves.toBeNull();
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: "factory-users", Key: { alias: "@factory-user" },
    });
  });

  it("requires table configuration only when a user DAO is requested", () => {
    delete process.env.USER_TABLE_NAME;
    const factory = new AWSDAOFactory();
    expect(() => factory.getUserDAO()).toThrow("internal-server-error: USER_TABLE_NAME is required");
    expect(() => new AWSDAOFactory(" ").getUserDAO()).toThrow("USER_TABLE_NAME is required");
  });
});

describe("UserService through the abstract factory", () => {
  function setup() {
    const lookup = jest.fn<(alias: string) => Promise<User | null>>();
    const dao: UserDAO = {
      createUser: async () => true,
      getPasswordHash: async () => null,
      getUserByAlias: lookup,
    };
    const factory: DAOFactory = {
      getStoryDAO: () => { throw new Error("Unexpected story DAO request"); },
      getFeedDAO: () => { throw new Error("Unexpected feed DAO request"); },
      getFollowDAO: () => { throw new Error("Unexpected follow DAO request"); },
      getImageDAO: () => { throw new Error("User lookup must not request image storage"); },
      getUserDAO: () => dao,
      getAuthTokenDAO: () => ({
        createAuthToken: async () => true,
        getAuthToken: async token => ({ token, userAlias: "@session-owner", lastActiveTimestamp: Date.now() }),
        updateLastActiveTimestamp: async () => true,
        deleteAuthToken: async () => {},
      }),
    };
    return { service: new UserService(factory), lookup };
  }

  it("returns the profile supplied by an alternative DAO implementation", async () => {
    const { service, lookup } = setup();
    const user = new User("Factory", "Example", "@factory-user", "https://example.com/user.png");
    lookup.mockResolvedValue(user);
    await expect(service.getUser("session-token", user.alias)).resolves.toBe(user);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith(user.alias);
  });

  it("preserves the missing-user result", async () => {
    const { service, lookup } = setup();
    lookup.mockResolvedValue(null);
    await expect(service.getUser("session-token", "@missing")).resolves.toBeNull();
  });

  it("propagates DAO errors rather than returning a dummy user or null", async () => {
    const { service, lookup } = setup();
    const error = new Error("Storage unavailable");
    lookup.mockRejectedValue(error);
    await expect(service.getUser("session-token", "@factory-user")).rejects.toBe(error);
  });
});
