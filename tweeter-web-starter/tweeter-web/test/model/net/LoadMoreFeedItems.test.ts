/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { AuthToken, PagedStatusItemRequest, Status, StatusDto, Type, User } from "tweeter-shared";
import { handler } from "../../../../tweeter-server/src/lambda/status/LoadMoreFeedItemsLambda";
import { StatusService as ServerStatusService } from "../../../../tweeter-server/src/model/service/StatusService";
import { StatusService } from "../../../src/model.service/StatusService";
import { ServerFacade } from "../../../src/model/net/ServerFacade";

const request: PagedStatusItemRequest = {
  token: "feed-token", userAlias: "@allen", pageSize: 20, lastItem: null,
};
const firstDto: StatusDto = {
  post: "Post 0 0\n        My friend @amy likes this website: http://byu.edu. Do you? \n        Or do you prefer this one: http://cs.byu.edu?",
  user: {
    firstName: "Allen", lastName: "Anderson", alias: "@allen",
    imageUrl: "https://faculty.cs.byu.edu/~jwilkerson/cs340/tweeter/images/donald_duck.png",
  },
  timestamp: 0,
};
const authToken = new AuthToken(request.token, 123456);

afterEach(() => { jest.restoreAllMocks(); });

describe("loadMoreFeedItems client/server contract", () => {
  it("retrieves first, subsequent, final, and exhausted pages through real local layers and JSON", async () => {
    const serverMethod = jest.spyOn(ServerStatusService.prototype, "loadMoreFeedItems");
    const bodies: PagedStatusItemRequest[] = [];
    const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      expect(url).toBe("https://we8tshfgt5.execute-api.us-east-2.amazonaws.com/prod/lambda/feed/list");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("Content-type")).toBe("application/json");
      const body = JSON.parse(init?.body as string);
      bodies.push(body);
      const response = JSON.parse(JSON.stringify(await handler(body)));
      expect(response.success).toBe(true);
      expect(response.message).toBeNull();
      expect(Object.keys(response.items[0] ?? firstDto).sort()).toEqual(["post", "timestamp", "user"]);
      return new Response(JSON.stringify(response));
    });
    const service = new StatusService();
    const [first, moreFirst] = await service.loadMoreFeedItems(authToken, request.userAlias, 20, null);
    expect(first).toHaveLength(20);
    expect(moreFirst).toBe(true);
    expect(first[0]).toBeInstanceOf(Status);
    expect(first[0].user).toBeInstanceOf(User);
    expect(first[0].dto).toEqual(firstDto);
    expect(first[0].user.name).toBe("Allen Anderson");
    expect(first[0].formattedDate).toEqual(expect.any(String));
    expect(first[0].segments.some(segment => segment.type === Type.alias)).toBe(true);
    expect(first[0].segments.some(segment => segment.type === Type.url)).toBe(true);
    expect(first[0].segments.some(segment => segment.type === Type.newline)).toBe(true);

    const [second, moreSecond] = await service.loadMoreFeedItems(authToken, request.userAlias, 20, first[19]);
    expect(second).toHaveLength(20);
    expect(moreSecond).toBe(true);
    expect(second[0].post.startsWith("Post 0 20\n")).toBe(true);
    expect(second[0].user.alias).toBe("@kent");
    expect(second[0].timestamp).toBe(600000000000);
    expect(first.some(item => item.equals(second[0]))).toBe(false);

    const [final, moreFinal] = await service.loadMoreFeedItems(authToken, request.userAlias, 20, second[19]);
    expect(final).toHaveLength(4);
    expect(moreFinal).toBe(false);
    expect(final[0].post.startsWith("Post 1 18\n")).toBe(true);
    expect(final[3].post.startsWith("Post 1 21\n")).toBe(true);
    expect(final[3].timestamp).toBe(1290000000000);
    await expect(service.loadMoreFeedItems(authToken, request.userAlias, 20, final[3]))
      .resolves.toEqual([[], false]);

    expect(bodies).toEqual([
      request,
      { ...request, lastItem: first[19].dto },
      { ...request, lastItem: second[19].dto },
      { ...request, lastItem: final[3].dto },
    ]);
    bodies.forEach((body, index) => {
      expect(serverMethod).toHaveBeenNthCalledWith(index + 1, body.token, body.userAlias, body.pageSize, body.lastItem);
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("round trips a status DTO through JSON without private fields or derived segments", () => {
    const status = Status.fromDto(JSON.parse(JSON.stringify(firstDto))) as Status;
    expect(status.dto).toEqual(firstDto);
    expect(Status.fromDto(null)).toBeNull();
    expect(status.equals(new Status(firstDto.post, User.fromDto(firstDto.user) as User, 0))).toBe(true);
    expect(JSON.parse(JSON.stringify(status.dto))).toEqual(firstDto);
  });

  it("awaits the server service and preserves its items and pagination flag", async () => {
    let finish!: (value: [StatusDto[], boolean]) => void;
    const serverMethod = jest.spyOn(ServerStatusService.prototype, "loadMoreFeedItems")
      .mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    let completed = false;
    const result = handler({ ...request, lastItem: firstDto }).then(response => { completed = true; return response; });
    expect(serverMethod).toHaveBeenCalledWith(request.token, request.userAlias, 20, firstDto);
    await Promise.resolve();
    expect(completed).toBe(false);
    finish([[firstDto], false]);
    await expect(result).resolves.toEqual({ success: true, message: null, items: [firstDto], hasMore: false });
  });

  it("propagates a server service failure", async () => {
    jest.spyOn(ServerStatusService.prototype, "loadMoreFeedItems")
      .mockRejectedValue(new Error("internal-server-error: feed unavailable"));
    await expect(handler(request)).rejects.toThrow("internal-server-error: feed unavailable");
  });

  it.each(["Feed unavailable", null])("propagates application failure with message %s", async message => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: false, message })));
    await expect(new ServerFacade().loadMoreFeedItems(request)).rejects.toThrow(message ?? "Failed to load feed items");
  });

  it.each([
    { items: null, hasMore: false },
    { hasMore: false },
    { items: {}, hasMore: false },
    { items: [], hasMore: "false" },
    { items: [null], hasMore: false },
    { items: [{ ...firstDto, post: 12 }], hasMore: false },
    { items: [{ ...firstDto, timestamp: "0" }], hasMore: false },
    { items: [{ ...firstDto, timestamp: -1 }], hasMore: false },
    { items: [{ ...firstDto, timestamp: null }], hasMore: false },
    { items: [{ ...firstDto, user: null }], hasMore: false },
    { items: [{ ...firstDto, user: { ...firstDto.user, alias: "" } }], hasMore: false },
    { items: [{ ...firstDto, user: { ...firstDto.user, firstName: 1 } }], hasMore: false },
    { items: [{ ...firstDto, user: { ...firstDto.user, lastName: null } }], hasMore: false },
    { items: [{ ...firstDto, user: { ...firstDto.user, imageUrl: null } }], hasMore: false },
  ])("rejects malformed success data %j", async data => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, message: null, ...data })));
    await expect(new ServerFacade().loadMoreFeedItems(request)).rejects.toThrow("Invalid feed data returned by server");
  });

  it("accepts an empty successful feed page", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: true, message: null, items: [], hasMore: false,
    })));
    await expect(new ServerFacade().loadMoreFeedItems(request)).resolves.toEqual([[], false]);
  });

  it("propagates HTTP errors through the client service", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ error: "unauthorized: invalid token" }), { status: 401 },
    ));
    await expect(new StatusService().loadMoreFeedItems(authToken, request.userAlias, 20, null))
      .rejects.toThrow("unauthorized: invalid token");
  });

  it("propagates network errors through the client service", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network unavailable"));
    await expect(new StatusService().loadMoreFeedItems(authToken, request.userAlias, 20, null))
      .rejects.toThrow("Network unavailable");
  });
});
