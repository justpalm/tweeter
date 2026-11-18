/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it } from "@jest/globals";
import { User } from "tweeter-shared";
import { ServerFacade } from "../../../src/model/net/ServerFacade";

// Requires the followers endpoint in template.yaml to be deployed to prod.
describe("ServerFacade followers API integration", () => {
  it("retrieves follower pages and continues after the last user", async () => {
    const facade = new ServerFacade();
    const request = {
      token: "milestone-3-dummy-token",
      userAlias: "@allen",
      pageSize: 2,
      lastItem: null,
    };

    const [firstPage, hasMore] = await facade.getMoreFollowers(request);
    expect(firstPage.map((user) => user.alias)).toEqual(["@amy", "@bob"]);
    expect(firstPage[0]).toBeInstanceOf(User);
    expect(firstPage[0].name).toBe("Amy Ames");
    expect(hasMore).toBe(true);

    const [nextPage, nextHasMore] = await facade.getMoreFollowers({
      ...request,
      lastItem: firstPage[1].dto,
    });
    expect(nextPage.map((user) => user.alias)).toEqual(["@bonnie", "@chris"]);
    expect(nextHasMore).toBe(true);
  }, 30000);
});
