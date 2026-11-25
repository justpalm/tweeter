/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { expect, it, jest } from "@jest/globals";
import { strict as assert } from "node:assert";
import { DynamoDBClient } from "../../../../tweeter-server/node_modules/@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, QueryCommand } from "../../../../tweeter-server/node_modules/@aws-sdk/lib-dynamodb";
import { shouldDeleteTestData } from "../../../../tweeter-server/test/helpers/liveTestData.cjs";
import { withFollowFixture } from "./helpers/liveFollowFixture";

// Explicit live test only: requires deployment of persisted status code and both
// new table environment variables. Not executed as part of local-only tests.
it("persists real authors, paginates stories/feeds, and observes follow timing", async () => {
  const { STORY_TABLE_NAME: storyTable, FEED_TABLE_NAME: feedTable, AWS_REGION: region } = process.env;
  assert.ok(storyTable?.trim() && feedTable?.trim() && region?.trim(),
    "Set STORY_TABLE_NAME, FEED_TABLE_NAME, AWS_REGION and the follow fixture environment variables");
  const cleanup = shouldDeleteTestData();
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region, retryMode: "adaptive", maxAttempts: 12 }));
  const errors = jest.spyOn(console, "error").mockImplementation(() => {});
  const marker = "integration-status-api:";
  try {
    await withFollowFixture("status", async ({ api, users: [author, , reader], tokens: [token, readerToken], call }) => {
      async function clearStatuses() {
        for (const [table, owner] of [[storyTable!, author.alias], [storyTable!, reader.alias],
          [feedTable!, author.alias], [feedTable!, reader.alias]]) {
          let after: Record<string, unknown> | undefined;
          do {
            const page = await client.send(new QueryCommand({ TableName: table, ConsistentRead: true,
              KeyConditionExpression: "owner_alias = :owner", ExpressionAttributeValues: { ":owner": owner },
              ExclusiveStartKey: after }));
            for (const item of page.Items ?? []) {
              assert.ok([author.alias, reader.alias].includes(item.status?.user?.alias), "Refuse to delete an unowned author");
              assert.ok(item.status?.post?.startsWith(marker), "Refuse to delete an unowned post");
              await client.send(new DeleteCommand({ TableName: table,
                Key: { owner_alias: owner, status_key: item.status_key },
                ConditionExpression: "#s.#u.#a = :author AND begins_with(#s.#p, :marker)",
                ExpressionAttributeNames: { "#s": "status", "#u": "user", "#a": "alias", "#p": "post" },
                ExpressionAttributeValues: { ":author": item.status.user.alias, ":marker": marker } }));
            }
            after = page.LastEvaluatedKey;
          } while (after);
          const check = await client.send(new QueryCommand({ TableName: table, ConsistentRead: true,
            KeyConditionExpression: "owner_alias = :owner", ExpressionAttributeValues: { ":owner": owner }, Limit: 1 }));
          assert.equal(check.Items?.length ?? 0, 0, "Owned status partition must be empty after cleanup");
        }
      }
      await clearStatuses();
      try {
        const post = (text: string) => call(() => api.postStatus({ token,
          // Deliberately spoof the supplied profile/time; stored owner is authoritative.
          newStatus: { post: marker + text, user: reader.dto, timestamp: 0 } }));
        await post("before-follow");
        await call(() => api.follow({ token: readerToken, userAlias: author.alias }));
        for (let i = 0; i < 11; i++) await post(`during-${i}`);
        await call(() => api.unfollow({ token: readerToken, userAlias: author.alias }));
        await post("after-unfollow");
        const request = { token, userAlias: author.alias, pageSize: 10, lastItem: null };
        const [first, more] = await call(() => api.loadMoreStoryItems(request));
        const [last, done] = await call(() => api.loadMoreStoryItems({ ...request, lastItem: first[9].dto }));
        expect([first.length, more, last.length, done]).toEqual([10, true, 3, false]);
        const story = [...first, ...last];
        for (const status of story) { expect(status.user.dto).toEqual(author.dto); expect(status.timestamp).toBeGreaterThan(0); }
        expect(new Set(story.map(s => s.timestamp)).size).toBe(13);
        expect(story.map(s => s.timestamp)).toEqual(story.map(s => s.timestamp).sort((a, b) => b - a));
        const feedRequest = { ...request, token: readerToken, userAlias: reader.alias };
        await expect(call(() => api.loadMoreFeedItems({ ...feedRequest, userAlias: author.alias })))
          .rejects.toThrow("unauthorized:");
        const [feed, feedMore] = await call(() => api.loadMoreFeedItems(feedRequest));
        const [tail, tailMore] = await call(() => api.loadMoreFeedItems({ ...feedRequest, lastItem: feed[9].dto }));
        expect([feed.length, feedMore, tail.length, tailMore]).toEqual([10, true, 1, false]);
        expect([...feed, ...tail].map(s => s.post)).toEqual(Array.from({ length: 11 }, (_, i) => `${marker}during-${10 - i}`));
        await call(() => api.logout({ token }));
        await expect(call(() => api.loadMoreStoryItems(request))).rejects.toThrow("unauthorized:");
      } finally {
        if (cleanup) await clearStatuses();
        else console.log("KEPT: owned status API stories/feed entries");
      }
    });
  } finally { errors.mockRestore(); client.destroy(); }
}, 240000);
