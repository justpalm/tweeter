/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { ConditionalCheckFailedException } from "../../../../tweeter-server/node_modules/@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "../../../../tweeter-server/node_modules/@aws-sdk/lib-dynamodb";
import { DynamoAuthTokenDAO } from "../../../../tweeter-server/src/model/dao/dynamodb/DynamoAuthTokenDAO";

const record = { token: "test-session", userAlias: "@session-owner", lastActiveTimestamp: 1000 };
const dao = new DynamoAuthTokenDAO("test-sessions");
const conditionFailure = () => new ConditionalCheckFailedException({ message: "Condition failed", $metadata: {} });
afterEach(() => { jest.restoreAllMocks(); });

describe("DynamoAuthTokenDAO (mocked SDK, no AWS calls)", () => {
  it("creates only when the token does not exist", async () => {
    const send = jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async () => ({}));
    await expect(dao.createAuthToken(record)).resolves.toBe(true);
    expect(send).toHaveBeenCalledWith(expect.any(PutCommand));
    expect(send.mock.calls[0][0].input).toEqual({
      TableName: "test-sessions", Item: record,
      ConditionExpression: "attribute_not_exists(#token)",
      ExpressionAttributeNames: { "#token": "token" },
    });
  });

  it("returns false on duplicate creation without issuing an overwrite", async () => {
    const send = jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async () => { throw conditionFailure(); });
    await expect(dao.createAuthToken(record)).resolves.toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("reads the session consistently without refreshing activity or exposing extra fields", async () => {
    const send = jest.spyOn(DynamoDBDocumentClient.prototype, "send")
      .mockImplementation(async () => ({ Item: { ...record, extra: "not returned" } }));
    await expect(dao.getAuthToken(record.token)).resolves.toEqual(record);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.any(GetCommand));
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: "test-sessions", Key: { token: record.token }, ConsistentRead: true,
    });
  });

  it("returns null for a missing session", async () => {
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async () => ({}));
    await expect(dao.getAuthToken(record.token)).resolves.toBeNull();
  });

  it.each([
    { ...record, userAlias: undefined }, { ...record, token: "wrong-token" },
    { ...record, lastActiveTimestamp: "1000" }, { ...record, lastActiveTimestamp: NaN },
  ])("rejects a malformed stored record: %j", async (item) => {
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async () => ({ Item: item }));
    await expect(dao.getAuthToken(record.token)).rejects.toThrow("Invalid auth token record stored");
  });

  it("updates only an existing session whose activity is not newer", async () => {
    const send = jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async () => ({}));
    await expect(dao.updateLastActiveTimestamp(record.token, 2000)).resolves.toBe(true);
    expect(send).toHaveBeenCalledWith(expect.any(UpdateCommand));
    expect(send.mock.calls[0][0].input).toEqual({
      TableName: "test-sessions", Key: { token: record.token },
      UpdateExpression: "SET lastActiveTimestamp = :timestamp",
      ConditionExpression: "attribute_exists(#token) AND lastActiveTimestamp <= :timestamp",
      ExpressionAttributeNames: { "#token": "token" },
      ExpressionAttributeValues: { ":timestamp": 2000 },
    });
  });

  it.each([1000, 2000])("preserves an equal or newer stored timestamp (%i)", async (storedTime) => {
    const send = jest.spyOn(DynamoDBDocumentClient.prototype, "send")
      .mockImplementationOnce(async () => { throw conditionFailure(); })
      .mockImplementationOnce(async () => ({ Item: { ...record, lastActiveTimestamp: storedTime } }));
    await expect(dao.updateLastActiveTimestamp(record.token, 1000)).resolves.toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0]).toBeInstanceOf(GetCommand);
  });

  it("returns false after logout without retrying a write or recreating the session", async () => {
    const send = jest.spyOn(DynamoDBDocumentClient.prototype, "send")
      .mockImplementationOnce(async () => { throw conditionFailure(); })
      .mockImplementationOnce(async () => ({}));
    await expect(dao.updateLastActiveTimestamp(record.token, 2000)).resolves.toBe(false);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0]).toBeInstanceOf(GetCommand);
  });

  it("retries conditionally if a session reappears with an older timestamp", async () => {
    const send = jest.spyOn(DynamoDBDocumentClient.prototype, "send")
      .mockImplementationOnce(async () => { throw conditionFailure(); })
      .mockImplementationOnce(async () => ({ Item: record }))
      .mockImplementationOnce(async () => ({}));
    await expect(dao.updateLastActiveTimestamp(record.token, 2000)).resolves.toBe(true);
    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls[2][0]).toBeInstanceOf(UpdateCommand);
  });

  it("deletes by token and accepts an already-absent session", async () => {
    const send = jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async () => ({}));
    await expect(dao.deleteAuthToken(record.token)).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledWith(expect.any(DeleteCommand));
    expect(send.mock.calls[0][0].input).toEqual({ TableName: "test-sessions", Key: { token: record.token } });
  });

  it("propagates storage failures from every operation", async () => {
    const failure = new Error("Database unavailable");
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async () => { throw failure; });
    await expect(dao.createAuthToken(record)).rejects.toBe(failure);
    await expect(dao.getAuthToken(record.token)).rejects.toBe(failure);
    await expect(dao.updateLastActiveTimestamp(record.token, 2000)).rejects.toBe(failure);
    await expect(dao.deleteAuthToken(record.token)).rejects.toBe(failure);
  });

  it("propagates failures while checking a refused update", async () => {
    const failure = new Error("Read unavailable");
    jest.spyOn(DynamoDBDocumentClient.prototype, "send")
      .mockImplementationOnce(async () => { throw conditionFailure(); })
      .mockImplementationOnce(async () => { throw failure; });
    await expect(dao.updateLastActiveTimestamp(record.token, 2000)).rejects.toBe(failure);
  });

  it("rejects invalid records/timestamps before sending requests", async () => {
    const send = jest.spyOn(DynamoDBDocumentClient.prototype, "send");
    await expect(dao.createAuthToken({ ...record, userAlias: " " })).rejects.toThrow("Invalid auth token record");
    for (const timestamp of [-1, NaN, Infinity, 1.5]) {
      await expect(dao.createAuthToken({ ...record, lastActiveTimestamp: timestamp })).rejects.toThrow("Invalid auth token record");
      await expect(dao.updateLastActiveTimestamp(record.token, timestamp)).rejects.toThrow("Invalid last active timestamp");
    }
    expect(send).not.toHaveBeenCalled();
  });

  it("requires a nonblank table name", () => {
    expect(() => new DynamoAuthTokenDAO(" ")).toThrow("Auth token table name is required");
  });
});
