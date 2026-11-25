/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, expect, it, jest } from "@jest/globals";
import { TransactionCanceledException } from "../../../../tweeter-server/node_modules/@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "../../../../tweeter-server/node_modules/@aws-sdk/lib-dynamodb";
import { DynamoFollowDAO } from "../../../../tweeter-server/src/model/dao/dynamodb/DynamoFollowDAO";
import { AWSDAOFactory } from "../../../../tweeter-server/src/model/dao/factory/AWSDAOFactory";

const dao = new DynamoFollowDAO("follows", "users", "follows_index");
const mock = (value: object = {}) => jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async () => value);
afterEach(() => { jest.restoreAllMocks(); });

it("looks up exact edges and reads legacy/missing/invalid counts", async () => {
  const send = mock();
  expect(await dao.isFollowing("@a", "@b")).toBe(false);
  expect(send.mock.calls[0][0].input).toMatchObject({ ConsistentRead: true,
    Key: { follower_handle: "@a", followee_handle: "@b" } });
  expect(await dao.getCounts("@a")).toBeNull();
  send.mockResolvedValue({ Item: { alias: "@a" } } as never);
  expect(await dao.isFollowing("@a", "@b")).toBe(true);
  expect(await dao.getCounts("@a")).toEqual({ followerCount: 0, followeeCount: 0 });
  send.mockResolvedValue({ Item: { followerCount: 2, followeeCount: 3 } } as never);
  expect(await dao.getCounts("@a")).toEqual({ followerCount: 2, followeeCount: 3 });
  send.mockResolvedValue({ Item: { followerCount: null } } as never);
  await expect(dao.getCounts("@a")).rejects.toThrow("Invalid stored");
});

it.each([true, false])("paginates the correct direction (followers=%s), including byte-limited pages", async followers => {
  const send = mock({ Items: [{ [followers ? "follower_handle" : "followee_handle"]: "@b" }], LastEvaluatedKey: { k: "x" } });
  send.mockResolvedValueOnce({ Items: [], LastEvaluatedKey: { k: "first" } } as never);
  send.mockResolvedValueOnce({ Items: [{ [followers ? "follower_handle" : "followee_handle"]: "@b" }], LastEvaluatedKey: { k: "second" } } as never);
  send.mockResolvedValueOnce({ Items: [{ [followers ? "follower_handle" : "followee_handle"]: "@c" }] } as never);
  const page = followers ? dao.getFollowers.bind(dao) : dao.getFollowees.bind(dao);
  expect(await page("@a", 1, "@a")).toEqual({ aliases: ["@b"], hasMore: true });
  expect(send.mock.calls[0][0].input).toMatchObject({ IndexName: followers ? "follows_index" : undefined,
    ConsistentRead: !followers, KeyConditionExpression: "#pk = :user AND #sk > :after",
    ExpressionAttributeNames: { "#pk": followers ? "followee_handle" : "follower_handle" },
    ExpressionAttributeValues: { ":user": "@a", ":after": "@a" } });
  send.mockResolvedValue({ Items: [] } as never);
  expect(await page("@a", 1, "@c")).toEqual({ aliases: [], hasMore: false });
  expect(await page("@a", 1, null)).toEqual({ aliases: [], hasMore: false });
  await expect(page("@a", 0, null)).rejects.toThrow("Page size");
});

it.each([true, false])("atomically changes edge and correct counters (adding=%s)", async adding => {
  const send = mock();
  const change = adding ? dao.follow.bind(dao) : dao.unfollow.bind(dao);
  expect(await change("@a", "@b")).toBe(true);
  expect(send.mock.calls[0][0]).toBeInstanceOf(TransactWriteCommand);
  const items = (send.mock.calls[0][0].input as TransactWriteCommand["input"]).TransactItems!;
  expect(items).toHaveLength(3);
  expect(adding ? items[0].Put?.Item : items[0].Delete?.Key).toEqual({ follower_handle: "@a", followee_handle: "@b" });
  expect((items[0].Put ?? items[0].Delete)?.ConditionExpression).toContain(adding ? "attribute_not_exists" : "attribute_exists");
  for (const [i, alias, count] of [[1, "@a", "followeeCount"], [2, "@b", "followerCount"]] as const) {
    expect(items[i].Update).toMatchObject({ TableName: "users", Key: { alias }, UpdateExpression: "ADD #count :delta",
      ExpressionAttributeNames: { "#count": count }, ExpressionAttributeValues: { ":delta": adding ? 1 : -1 } });
    expect(items[i].Update?.ConditionExpression).toBe("attribute_exists(alias)" + (adding ? "" : " AND #count >= :one"));
  }
  const canceled = (codes: string[]) => new TransactionCanceledException({ $metadata: {}, message: "Canceled",
    CancellationReasons: codes.map(Code => ({ Code })) });
  send.mockRejectedValue(canceled(["ConditionalCheckFailed", "None", "ConditionalCheckFailed"]) as never);
  expect(await change("@a", "@b")).toBe(false);
  const failure = canceled(["None", "ConditionalCheckFailed", "None"]);
  send.mockRejectedValue(failure as never);
  await expect(change("@a", "@b")).rejects.toBe(failure);
  await expect(change("@a", "@a")).rejects.toThrow("yourself");
});

it("propagates storage errors and configures/caches the factory DAO lazily", async () => {
  const failure = new Error("offline");
  mock().mockRejectedValue(failure as never);
  for (const operation of [dao.isFollowing("@a", "@b"), dao.getCounts("@a"),
    dao.getFollowers("@a", 1, null), dao.follow("@a", "@b"), dao.unfollow("@a", "@b")]) {
    await expect(operation).rejects.toBe(failure);
  }
  const factory = new AWSDAOFactory("users", undefined, undefined, undefined, "follows", "follows_index");
  expect(factory.getFollowDAO()).toBeInstanceOf(DynamoFollowDAO);
  expect(factory.getFollowDAO()).toBe(factory.getFollowDAO());
  expect(() => new AWSDAOFactory("users", undefined, undefined, undefined, "", "idx").getFollowDAO()).toThrow("FOLLOW_TABLE_NAME");
});
