/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { ConditionalCheckFailedException } from "../../../../tweeter-server/node_modules/@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "../../../../tweeter-server/node_modules/@aws-sdk/lib-dynamodb";
import { User } from "tweeter-shared";
import { DynamoUserDAO } from "../../../../tweeter-server/src/model/dao/dynamodb/DynamoUserDAO";

const profile = {
  firstName: "Jane", lastName: "Smith", alias: "@jane",
  imageUrl: "https://example.com/jane.png",
};
const passwordHash = "test-password-hash";
const user = new User(profile.firstName, profile.lastName, profile.alias, profile.imageUrl);
const dao = new DynamoUserDAO("test-users");

afterEach(() => { jest.restoreAllMocks(); });

describe("DynamoUserDAO (mocked SDK, no AWS calls)", () => {
  it("creates the account with an atomic no-overwrite condition", async () => {
    const send = jest.spyOn(DynamoDBDocumentClient.prototype, "send")
      .mockImplementation(async () => ({}));
    await expect(dao.createUser(user, passwordHash)).resolves.toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.any(PutCommand));
    expect(send.mock.calls[0][0].input).toEqual({
      TableName: "test-users", Item: { ...profile, passwordHash },
      ConditionExpression: "attribute_not_exists(#alias)",
      ExpressionAttributeNames: { "#alias": "alias" },
    });
  });

  it("returns false only for a duplicate alias", async () => {
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async () => {
      throw new ConditionalCheckFailedException({ message: "Already exists", $metadata: {} });
    });
    await expect(dao.createUser(user, passwordHash)).resolves.toBe(false);
  });

  it("returns a User without including the password hash", async () => {
    const send = jest.spyOn(DynamoDBDocumentClient.prototype, "send")
      .mockImplementation(async () => ({ Item: { ...profile, passwordHash } }));
    const result = await dao.getUserByAlias(profile.alias);
    expect(result).toBeInstanceOf(User);
    expect(result?.dto).toEqual(profile);
    expect(result).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(result)).not.toContain(passwordHash);
    expect(send).toHaveBeenCalledWith(expect.any(GetCommand));
    expect(send.mock.calls[0][0].input).toEqual({
      TableName: "test-users", Key: { alias: profile.alias }, ConsistentRead: true,
      ProjectionExpression: "firstName, lastName, #alias, imageUrl",
      ExpressionAttributeNames: { "#alias": "alias" },
    });
  });

  it("retrieves the password hash separately", async () => {
    const send = jest.spyOn(DynamoDBDocumentClient.prototype, "send")
      .mockImplementation(async () => ({ Item: { passwordHash } }));
    await expect(dao.getPasswordHash(profile.alias)).resolves.toBe(passwordHash);
    expect(send.mock.calls[0][0].input).toEqual({
      TableName: "test-users", Key: { alias: profile.alias },
      ConsistentRead: true, ProjectionExpression: "passwordHash",
    });
  });

  it("returns null for missing users in both lookups", async () => {
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async () => ({}));
    await expect(dao.getUserByAlias("@missing")).resolves.toBeNull();
    await expect(dao.getPasswordHash("@missing")).resolves.toBeNull();
  });

  it("rejects malformed stored records rather than treating them as absent", async () => {
    jest.spyOn(DynamoDBDocumentClient.prototype, "send")
      .mockImplementation(async () => ({ Item: { alias: profile.alias } }));
    await expect(dao.getUserByAlias(profile.alias)).rejects.toThrow("Invalid user profile");
    await expect(dao.getPasswordHash(profile.alias)).rejects.toThrow("Invalid password hash");
  });

  it("propagates storage failures from all three operations", async () => {
    const failure = new Error("Database unavailable");
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async () => { throw failure; });
    await expect(dao.createUser(user, passwordHash)).rejects.toBe(failure);
    await expect(dao.getUserByAlias(profile.alias)).rejects.toBe(failure);
    await expect(dao.getPasswordHash(profile.alias)).rejects.toBe(failure);
  });

  it("requires an explicit nonblank table name", () => {
    expect(() => new DynamoUserDAO(" ")).toThrow("User table name is required");
  });
});
