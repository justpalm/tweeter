/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { User } from "tweeter-shared";
import { DynamoDBDocumentClient } from "../../../../tweeter-server/node_modules/@aws-sdk/lib-dynamodb";
import { AWSDAOFactory } from "../../../../tweeter-server/src/model/dao/factory/AWSDAOFactory";
import type { DAOFactory } from "../../../../tweeter-server/src/model/dao/factory/DAOFactory";
import type { UserDAO } from "../../../../tweeter-server/src/model/dao/UserDAO";
import { DynamoUserDAO } from "../../../../tweeter-server/src/model/dao/dynamodb/DynamoUserDAO";
import { UserService } from "../../../../tweeter-server/src/model/service/UserService";

const originalTableName = process.env.USER_TABLE_NAME;
afterEach(() => {
  jest.restoreAllMocks();
  if (originalTableName === undefined) delete process.env.USER_TABLE_NAME;
  else process.env.USER_TABLE_NAME = originalTableName;
});

describe("AWSDAOFactory", () => {
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
    const factory: DAOFactory = { getUserDAO: () => dao };
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
