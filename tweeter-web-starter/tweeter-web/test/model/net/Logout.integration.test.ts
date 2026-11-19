/** @jest-environment node */
// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it } from "@jest/globals";
import { UserService } from "../../../src/model.service/UserService";

// Requires LogoutLambda and POST /lambda/logout to be deployed to prod.
describe("UserService logout live API integration", () => {
  it("acknowledges logout for a session returned by login", async () => {
    const service = new UserService();
    const [, token] = await service.login("@student", "test-password");
    expect(token.token.length).toBeGreaterThan(0);
    await expect(service.logout(token)).resolves.toBeUndefined();
  }, 30000);
});
