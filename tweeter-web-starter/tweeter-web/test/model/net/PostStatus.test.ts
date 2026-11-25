/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AuthToken, Status, User } from "tweeter-shared";
import { handler } from "../../../../tweeter-server/src/lambda/status/PostStatusLambda";
import * as server from "../../../../tweeter-server/src/model/service/StatusService";
import { StatusService } from "../../../src/model.service/StatusService";

import { installStatusFixture } from "./helpers/statusFixture";
import { AWSDAOFactory } from "../../../../tweeter-server/src/model/dao/factory/AWSDAOFactory";

const user = new User("Student", "Author", "@student", "https://example.com/author.png");
const status = new Status("Hello @allen!\nVisit https://example.com", user, 0);
const token = new AuthToken("post-token", 123456);
const request = { token: "post-token", newStatus: status.dto };

beforeEach(() => { installStatusFixture("@student"); });

afterEach(() => { jest.restoreAllMocks(); });

describe("postStatus local client/server path", () => {
  it("sends the token and status as JSON and receives an acknowledgement", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      expect(url).toBe("https://we8tshfgt5.execute-api.us-east-2.amazonaws.com/prod/lambda/status/post");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body).toEqual(request);
      const response = await handler(body);
      expect(response).toEqual({ success: true, message: null });
      return new Response(JSON.stringify(response));
    });
    await expect(new StatusService().postStatus(token, status)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("waits for the server service before reporting success", async () => {
    let finish!: () => void;
    const service = new server.StatusService(new AWSDAOFactory());
    jest.spyOn(server, "StatusService").mockImplementation(() => service);
    jest.spyOn(service, "postStatus")
      .mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    let completed = false;
    const result = handler(request).then(() => { completed = true; });
    await Promise.resolve();
    expect(completed).toBe(false);
    finish();
    await result;
    expect(completed).toBe(true);
  });

  it("propagates a server service failure", async () => {
    const service = new server.StatusService(new AWSDAOFactory());
    jest.spyOn(server, "StatusService").mockImplementation(() => service);
    jest.spyOn(service, "postStatus").mockRejectedValue(new Error("post failed"));
    await expect(handler(request)).rejects.toThrow("post failed");
  });

  it("reports an unsuccessful API response", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: false, message: "Post rejected",
    })));
    await expect(new StatusService().postStatus(token, status)).rejects.toThrow("Post rejected");
  });
});
