/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it } from "@jest/globals";
import { AuthToken, User } from "tweeter-shared";
import { ServerFacade } from "../../../src/model/net/ServerFacade";

// Requires RegisterLambda and POST /lambda/register to be deployed to prod.
describe("ServerFacade registration live API integration", () => {
  // Registration persistence/session issuance is still a separate milestone step.
  it("returns the current dummy registration user and token shape", async () => {
    const [user, token] = await new ServerFacade().register({
      firstName: "Test", lastName: "Student", alias: "@student", password: "test-password",
      imageStringBase64: "AP+A", imageFileExtension: "png",
    });
    expect(user).toBeInstanceOf(User);
    expect(user.dto).toEqual({
      firstName: "Allen", lastName: "Anderson", alias: "@allen",
      imageUrl: "https://faculty.cs.byu.edu/~jwilkerson/cs340/tweeter/images/donald_duck.png",
    });
    expect(token).toBeInstanceOf(AuthToken);
    expect(typeof token.token).toBe("string");
    expect(token.token.length).toBeGreaterThan(0);
    expect((!!token.timestamp)).toBe(true);
    expect(token.timestamp).toBeGreaterThan(0);
    expect(token.timestamp).toBeLessThanOrEqual(Date.now());
  }, 30000);
});
