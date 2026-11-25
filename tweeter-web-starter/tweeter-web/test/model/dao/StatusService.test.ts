/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, expect, it, jest } from "@jest/globals";
import { StatusService } from "../../../../tweeter-server/src/model/service/StatusService";
import { statusFixture } from "../net/helpers/statusFixture";

afterEach(() => { jest.restoreAllMocks(); });
const input = { post: "Hello @reader", user: { alias: "@spoof", firstName: "Spoof", lastName: "User", imageUrl: "fake" }, timestamp: 0 };

it("uses the stored author/profile and server time; handles collisions and paginates 12 real posts", async () => {
  const f = statusFixture();
  const service = new StatusService(f.factory, () => 1000);
  // A fixed clock simulates concurrent/same-millisecond posting. Keep below retry cap.
  for (let i = 0; i < 12; i++) {
    await new StatusService(f.factory, () => 1000 + Math.floor(i / 4)).postStatus("session", { ...input, post: `Post ${i}` });
  }
  const [first, more] = await service.loadMoreStoryItems("session", "@owner", 10, null);
  const [last, done] = await service.loadMoreStoryItems("session", "@owner", 10, first[9]);
  expect([first.length, more, last.length, done]).toEqual([10, true, 2, false]);
  expect(new Set([...first, ...last].map(s => s.timestamp)).size).toBe(12);
  expect(first[0]).toMatchObject({ user: f.profiles.get("@owner")!.dto, post: "Post 11", timestamp: 1011 });
  expect(f.feeds.get("@reader")).toHaveLength(12);
  expect(f.feeds.has("@owner")).toBe(false);
});

it("does not backfill on follow; retains old entries on unfollow; reads stored feeds", async () => {
  const f = statusFixture();
  let time = 10;
  const service = new StatusService(f.factory, () => time++);
  await service.postStatus("session", input);
  f.followers.add("@later");
  await service.postStatus("session", { ...input, post: "Second" });
  f.followers.delete("@reader");
  await service.postStatus("session", { ...input, post: "Third" });
  const story = jest.spyOn(f.story, "getStory");
  expect((await service.loadMoreFeedItems("reader-session", "@reader", 10, null))[0].map(s => s.post)).toEqual(["Second", input.post]);
  expect((await service.loadMoreFeedItems("later-session", "@later", 10, null))[0].map(s => s.post)).toEqual(["Third", "Second"]);
  expect(story).not.toHaveBeenCalled();
});

it("restricts feed reads to the authenticated owner but leaves other users' stories readable", async () => {
  const f = statusFixture();
  const service = new StatusService(f.factory);
  const getFeed = jest.spyOn(f.feed, "getFeed");
  await expect(service.loadMoreFeedItems("session", "@reader", 10, null)).rejects.toThrow("unauthorized:");
  expect(getFeed).not.toHaveBeenCalled();
  await expect(service.loadMoreStoryItems("session", "@reader", 10, null)).resolves.toEqual([[], false]);
});

it.each(["missing", "expired"])("rejects %s sessions on all three operations before storage", async token => {
  const f = statusFixture();
  const create = jest.spyOn(f.story, "createStatus");
  const read = jest.spyOn(f.story, "getStory");
  const feed = jest.spyOn(f.feed, "getFeed");
  const service = new StatusService(f.factory);
  for (const call of [() => service.postStatus(token, input),
    () => service.loadMoreStoryItems(token, "@owner", 2, null),
    () => service.loadMoreFeedItems(token, "@owner", 2, null)]) {
    await expect(call()).rejects.toThrow("unauthorized:");
  }
  for (const spy of [create, read, feed]) expect(spy).not.toHaveBeenCalled();
});

it("validates pages, story cursor owner, post content, and missing profiles", async () => {
  const f = statusFixture();
  const service = new StatusService(f.factory);
  for (const size of [0, 101, 1.5]) await expect(service.loadMoreFeedItems("session", "@owner", size, null)).rejects.toThrow("bad-request:");
  await expect(service.loadMoreStoryItems("session", "@owner", 2, input)).rejects.toThrow("cursor");
  await expect(service.loadMoreStoryItems("session", "@missing", 2, null)).rejects.toThrow("User not found");
  for (const post of [" ", "x".repeat(10001)]) await expect(service.postStatus("session", { ...input, post })).rejects.toThrow("bad-request:");
  f.profiles.delete("@owner");
  await expect(service.postStatus("session", input)).rejects.toThrow("User not found");
});

it("awaits feed delivery and propagates write failures without false acknowledgement", async () => {
  const f = statusFixture();
  let complete!: () => void;
  jest.spyOn(f.feed, "addToFeeds").mockImplementationOnce(() => new Promise<void>(resolve => { complete = resolve; }));
  const service = new StatusService(f.factory);
  let finished = false;
  const result = service.postStatus("session", input).then(() => { finished = true; });
  await new Promise(resolve => setImmediate(resolve));
  expect(finished).toBe(false);
  complete();
  await result;
  const failure = new Error("delivery failed");
  jest.spyOn(f.feed, "addToFeeds").mockRejectedValue(failure);
  await expect(service.postStatus("session", input)).rejects.toBe(failure);
  jest.spyOn(f.story, "createStatus").mockResolvedValue(false);
  await expect(service.postStatus("session", input)).rejects.toThrow("timestamp busy");
});
