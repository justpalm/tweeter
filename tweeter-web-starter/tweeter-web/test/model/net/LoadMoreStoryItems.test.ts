/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { AuthToken, PagedStatusItemRequest, Status, User } from "tweeter-shared";
import { handler } from "../../../../tweeter-server/src/lambda/status/LoadMoreStoryItemsLambda";
import { StatusService } from "../../../src/model.service/StatusService";
import { ServerFacade } from "../../../src/model/net/ServerFacade";

const request: PagedStatusItemRequest = {
  token: "story-token", userAlias: "@allen", pageSize: 2, lastItem: null,
};
const token = new AuthToken(request.token, 0);

afterEach(() => { jest.restoreAllMocks(); });

describe("loadMoreStoryItems local client/server path", () => {
  it("retrieves two pages and sends the last status as a JSON cursor", async () => {
    // Replace the network with the real local handler; keep JSON serialization.
    const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      expect(url).toBe("https://we8tshfgt5.execute-api.us-east-2.amazonaws.com/prod/lambda/story/list");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      return new Response(JSON.stringify(await handler(body)));
    });
    const service = new StatusService();
    const [first, hasMore] = await service.loadMoreStoryItems(token, "@allen", 2, null);
    expect(first).toHaveLength(2);
    expect(hasMore).toBe(true);
    expect(first[0]).toBeInstanceOf(Status);
    expect(first[0].user).toBeInstanceOf(User);
    expect(first[0].post.startsWith("Post 0 0\n")).toBe(true);
    expect(first[0].user.alias).toBe("@allen");
    expect(first[0].timestamp).toBe(0);

    const [second, moreSecond] = await service.loadMoreStoryItems(token, "@allen", 2, first[1]);
    expect(second).toHaveLength(2);
    expect(moreSecond).toBe(true);
    expect(second[0].post.startsWith("Post 0 2\n")).toBe(true);
    expect(second[0].user.alias).toBe("@bob");
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual(request);
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({
      ...request, lastItem: first[1].dto,
    });
  });

  it("accepts an empty final page", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: true, message: null, items: [], hasMore: false,
    })));
    await expect(new ServerFacade().loadMoreStoryItems(request)).resolves.toEqual([[], false]);
  });

  it("reports an unsuccessful API response", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: false, message: "story unavailable",
    })));
    await expect(new ServerFacade().loadMoreStoryItems(request)).rejects.toThrow("story unavailable");
  });

  it("rejects malformed page data", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: true, message: null, items: null, hasMore: false,
    })));
    await expect(new ServerFacade().loadMoreStoryItems(request)).rejects.toThrow("Invalid story data");
  });
});
