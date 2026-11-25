// AI-assisted: see AI-ATTRIBUTION.md
import { AuthToken, User, FakeData } from "tweeter-shared";
import type { DAOFactory } from "../dao/factory/DAOFactory";
import { AuthorizationService } from "./AuthorizationService";

export class UserService {
  public constructor(private readonly daoFactory: DAOFactory) {}

  // AI-assisted: see AI-ATTRIBUTION.md
  public async getUser (
    token: string,
    alias: string
  ): Promise<User | null> {
    await new AuthorizationService(this.daoFactory).authenticate(token);
    return this.daoFactory.getUserDAO().getUserByAlias(alias);
  };


  // AI-assisted: see AI-ATTRIBUTION.md
  public logout = async (token: string): Promise<void> => {
    await new AuthorizationService(this.daoFactory).authenticate(token);
    await this.daoFactory.getAuthTokenDAO().deleteAuthToken(token);
  };


  // AI-assisted: see AI-ATTRIBUTION.md
  public async login(
    alias: string,
    password: string
  ): Promise<[User, AuthToken]> {
    // Milestone 3 returns dummy data; credential verification comes later.
    const user = FakeData.instance.firstUser;

    if (user === null) {
      throw new Error("internal-server-error: Login user data unavailable");
    }

    return [user, FakeData.instance.authToken];
  }

  // AI-assisted: see AI-ATTRIBUTION.md
  public async register(
    firstName: string,
    lastName: string,
    alias: string,
    password: string,
    imageStringBase64: string,
    imageFileExtension: string,
  ): Promise<[User, AuthToken]> {
    // Milestone 3 returns dummy data; account/image persistence comes later.
    const user = FakeData.instance.firstUser;
    if (user === null) {
      throw new Error("internal-server-error: Invalid registration");
    }
    return [user, FakeData.instance.authToken];
  }
}
