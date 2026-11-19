/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it } from "@jest/globals";
import { User } from "tweeter-shared";
import { UserService } from "../../../src/model.service/UserService";

// Requires GetUserLambda and POST /lambda/user/get to be deployed to prod.
describe("UserService getUser live API integration", () => {
  it("retrieves the expected dummy user and returns null for an unknown alias", async () => {
    const service = new UserService();
    const [, token] = await service.login("@student", "test-password");
    const user = await service.getUser(token, "@allen");
    expect(user).toBeInstanceOf(User);
    expect(user?.dto).toEqual({
      firstName: "Allen", lastName: "Anderson", alias: "@allen",
      imageUrl: "https://faculty.cs.byu.edu/~jwilkerson/cs340/tweeter/images/donald_duck.png",
    });
    await expect(service.getUser(token, "@unknown-get-user-alias")).resolves.toBeNull();
  }, 30000);
});
