// AI-assisted: see AI-ATTRIBUTION.md
import { AuthToken, User, FakeData } from "tweeter-shared";
import { compare } from "bcryptjs";
import { randomBytes } from "node:crypto";
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
    const userDAO = this.daoFactory.getUserDAO();
    const passwordHash = await userDAO.getPasswordHash(alias);
    if (passwordHash === null || !await compare(password, passwordHash)) {
      throw new Error("unauthorized: Invalid alias or password");
    }

    const user = await userDAO.getUserByAlias(alias);
    if (user === null) {
      throw new Error("internal-server-error: User profile unavailable");
    }

    const tokenDAO = this.daoFactory.getAuthTokenDAO();


    //Just exists to make sure that if we generate the same token on the VERY off chance, we try again.
    for (let attempt = 0; attempt < 3; attempt++) {
      // Use cryptographic randomness directly; never fall back to Math.random.
      const token = randomBytes(32).toString("hex");
      const timestamp = Date.now();
      const created = await tokenDAO.createAuthToken({
        token,
        userAlias: user.alias,
        lastActiveTimestamp: timestamp,
      });
      // Return only after persistence succeeds. Retry only an actual collision.
      if (created) return [user, new AuthToken(token, timestamp)];
    }
    throw new Error("internal-server-error: Unable to create session");
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
