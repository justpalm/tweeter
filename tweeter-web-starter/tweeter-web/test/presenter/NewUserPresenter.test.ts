// AI-assisted: see AI-ATTRIBUTION.md
import { describe, expect, it, jest } from "@jest/globals";
import { AuthToken, User } from "tweeter-shared";
import { NewUserPresenter } from "../../src/presenter/NewUserPresenter";
import type { LoginView } from "../../src/presenter/LoginPresenter";

function setup(originalUrl?: string) {
  const view: LoginView = {
    setAlias: jest.fn(), setPassword: jest.fn(), setIsLoading: jest.fn(),
    displayErrorMessage: jest.fn(), updateUserInfo: jest.fn(), navigate: jest.fn(), originalUrl,
  };
  return { view, presenter: new NewUserPresenter(view) };
}

const user = new User("Login", "Retry", "@login-retry", "https://example.com/retry.png");
const token = new AuthToken("retry-token", 123);

describe("NewUserPresenter loading cleanup", () => {
  it("restores the form after rejection so a corrected attempt can succeed", async () => {
    const { view, presenter } = setup();
    const operation = jest.fn<() => Promise<[User, AuthToken]>>()
      .mockRejectedValueOnce(new Error("unauthorized: Invalid alias or password"))
      .mockResolvedValueOnce([user, token]);
    await presenter.enteringUser("log user in", false, operation);
    expect(view.setIsLoading).toHaveBeenLastCalledWith(false);
    expect(view.displayErrorMessage).toHaveBeenCalledWith(expect.stringContaining("Invalid alias or password"));
    expect(view.updateUserInfo).not.toHaveBeenCalled();
    expect(view.navigate).not.toHaveBeenCalled();
    await presenter.enteringUser("log user in", true, operation);
    expect(operation).toHaveBeenCalledTimes(2);
    expect(view.setIsLoading).toHaveBeenNthCalledWith(1, true);
    expect(view.setIsLoading).toHaveBeenNthCalledWith(2, false);
    expect(view.setIsLoading).toHaveBeenNthCalledWith(3, true);
    expect(view.setIsLoading).toHaveBeenNthCalledWith(4, false);
    expect(view.updateUserInfo).toHaveBeenCalledWith(user, user, token, true);
    expect(view.navigate).toHaveBeenCalledWith("/feed/@login-retry");
  });

  it("clears loading after successful navigation to the original destination", async () => {
    const { view, presenter } = setup("/story/@someone");
    await presenter.enteringUser("register user", false, async () => [user, token]);
    expect(view.navigate).toHaveBeenCalledWith("/story/@someone");
    expect(view.setIsLoading).toHaveBeenLastCalledWith(false);
    expect(view.displayErrorMessage).not.toHaveBeenCalled();
  });
});
