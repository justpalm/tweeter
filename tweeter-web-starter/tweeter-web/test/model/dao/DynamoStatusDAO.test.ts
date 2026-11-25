/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, expect, it, jest } from "@jest/globals";
import { ConditionalCheckFailedException } from "../../../../tweeter-server/node_modules/@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand } from "../../../../tweeter-server/node_modules/@aws-sdk/lib-dynamodb";
import { DynamoStoryDAO } from "../../../../tweeter-server/src/model/dao/dynamodb/DynamoStoryDAO";
import { DynamoFeedDAO } from "../../../../tweeter-server/src/model/dao/dynamodb/DynamoFeedDAO";
import { statusKey } from "../../../../tweeter-server/src/model/dao/dynamodb/DynamoStatusStore";
import { AWSDAOFactory } from "../../../../tweeter-server/src/model/dao/factory/AWSDAOFactory";

const status = { post: "Hello", timestamp: 0, user: { alias: "@a", firstName: "A", lastName: "Student", imageUrl: "image" } };
const story = new DynamoStoryDAO("stories");
const feed = new DynamoFeedDAO("feeds");
const mock = () => jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async () => ({}));
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

it("encodes numeric order (including zero and fractions) and distinguishes feed author ties", () => {
  const times = [0, Number.MIN_VALUE, 0.5, 1, 10, Date.now(), Number.MAX_VALUE];
  const keys = times.map(timestamp => statusKey({ authorAlias: "@a", timestamp }));
  expect([...keys].sort()).toEqual(keys);
  expect(new Set(keys).size).toBe(times.length);
  expect(statusKey({ authorAlias: "@a", timestamp: -0 })).toBe(keys[0]);
  expect(statusKey({ authorAlias: "@b", timestamp: 0 })).not.toBe(keys[0]);
});

it("conditionally inserts stories, distinguishes collisions, and propagates storage failures", async () => {
  const send = mock();
  expect(await story.createStatus(status)).toBe(true);
  expect(send.mock.calls[0][0].input).toMatchObject({ TableName: "stories",
    Item: { owner_alias: "@a", status_key: statusKey({ authorAlias: "@a", timestamp: 0 }), status },
    ConditionExpression: "attribute_not_exists(owner_alias)" });
  send.mockRejectedValueOnce(new ConditionalCheckFailedException({ $metadata: {}, message: "exists" }) as never);
  expect(await story.createStatus(status)).toBe(false);
  send.mockRejectedValueOnce(new Error("offline") as never);
  await expect(story.createStatus(status)).rejects.toThrow("offline");
});

it.each([true, false])("reads descending exclusive pages across byte limits (story=%s)", async isStory => {
  const send = mock().mockResolvedValueOnce({ Items: [], LastEvaluatedKey: { owner_alias: "@a", status_key: "boundary" } } as never)
    .mockResolvedValueOnce({ Items: [{ status }, { status: { ...status, post: "older" } }] } as never);
  const read = isStory ? story.getStory.bind(story) : feed.getFeed.bind(feed);
  const cursor = { authorAlias: "@a", timestamp: 1 };
  expect(await read("@a", 1, cursor)).toEqual({ items: [status], hasMore: true });
  expect(send.mock.calls[0][0]).toBeInstanceOf(QueryCommand);
  expect(send.mock.calls[0][0].input).toMatchObject({ TableName: isStory ? "stories" : "feeds",
    ConsistentRead: true, ScanIndexForward: false, Limit: 2,
    KeyConditionExpression: "owner_alias = :owner AND status_key < :after",
    ExpressionAttributeValues: { ":owner": "@a", ":after": statusKey(cursor) } });
  expect(send.mock.calls[1][0].input).toHaveProperty("ExclusiveStartKey.status_key", "boundary");
  expect(await read("@a", 1, null)).toEqual({ items: [], hasMore: false });
  await expect(read("@a", 101, null)).rejects.toThrow("Page size");
});

it("chunks/deduplicates feed recipients and retries only unprocessed writes, with a finite limit", async () => {
  jest.useFakeTimers();
  const pending = { PutRequest: { Item: { owner_alias: "@0", status_key: "pending", status } } };
  const send = mock().mockResolvedValueOnce({ UnprocessedItems: { feeds: [pending] } } as never);
  const delivery = feed.addToFeeds([...Array.from({ length: 26 }, (_, i) => `@${i}`), "@0"], status);
  await jest.runAllTimersAsync();
  await delivery;
  expect(send.mock.calls).toHaveLength(3);
  expect(send.mock.calls[0][0]).toBeInstanceOf(BatchWriteCommand);
  const batches = send.mock.calls.map(([command]) => (command.input as BatchWriteCommand["input"]).RequestItems!.feeds);
  expect(batches.map(b => b.length)).toEqual([25, 1, 1]);
  expect(batches[1]).toEqual([pending]);
  send.mockResolvedValue({ UnprocessedItems: { feeds: [pending] } } as never);
  const failed = expect(feed.addToFeeds(["@0"], status)).rejects.toThrow("delivery incomplete");
  await jest.runAllTimersAsync();
  await failed;
  send.mockClear();
  await feed.addToFeeds([], status);
  expect(send).not.toHaveBeenCalled();
});

it("configures/caches both DAOs lazily, independently of other tables", () => {
  const factory = new AWSDAOFactory(undefined, undefined, undefined, undefined, undefined, undefined, "stories", "feeds");
  expect(factory.getStoryDAO()).toBeInstanceOf(DynamoStoryDAO);
  expect(factory.getStoryDAO()).toBe(factory.getStoryDAO());
  expect(factory.getFeedDAO()).toBeInstanceOf(DynamoFeedDAO);
  expect(factory.getFeedDAO()).toBe(factory.getFeedDAO());
  const missing = new AWSDAOFactory(undefined, undefined, undefined, undefined, undefined, undefined, " ", " ");
  expect(() => missing.getStoryDAO()).toThrow("STORY_TABLE_NAME");
  expect(() => missing.getFeedDAO()).toThrow("FEED_TABLE_NAME");
});
