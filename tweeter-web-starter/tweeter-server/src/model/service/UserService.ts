// AI-assisted: see AI-ATTRIBUTION.md
import { AuthToken, User } from "tweeter-shared";
import { compare, hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import type { DAOFactory } from "../dao/factory/DAOFactory";
import { AuthorizationService } from "./AuthorizationService";
import { decodeProfileImage } from "../domain/ProfileImage";

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
    // bcrypt compares at most 72 UTF-8 bytes; do not silently accept a suffix.
    if (Buffer.byteLength(password, "utf8") > 72) {
      throw new Error("unauthorized: Invalid alias or password");
    }
    const userDAO = this.daoFactory.getUserDAO();
    const passwordHash = await userDAO.getPasswordHash(alias);
    if (passwordHash === null || !await compare(password, passwordHash)) {
      throw new Error("unauthorized: Invalid alias or password");
    }

    const user = await userDAO.getUserByAlias(alias);
    if (user === null) {
      throw new Error("internal-server-error: User profile unavailable");
    }

    return [user, await this.issueSession(user.alias)];
  }

  // AI-assisted: see AI-ATTRIBUTION.md
  private async issueSession(userAlias: string): Promise<AuthToken> {
    const tokenDAO = this.daoFactory.getAuthTokenDAO();


    //Just exists to make sure that if we generate the same token on the VERY off chance, we try again.
    for (let attempt = 0; attempt < 3; attempt++) {
      // Use cryptographic randomness directly; never fall back to Math.random.
      const token = randomBytes(32).toString("hex");
      const timestamp = Date.now();
      const created = await tokenDAO.createAuthToken({
        token,
        userAlias,
        lastActiveTimestamp: timestamp,
      });
      // Return only after persistence succeeds. Retry only an actual collision.
      if (created) return new AuthToken(token, timestamp);
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
    const userDAO = this.daoFactory.getUserDAO();
    if (await userDAO.getUserByAlias(alias) !== null) {
      throw new Error("bad-request: Alias already registered");
    }
    if (Buffer.byteLength(password, "utf8") > 72) {
      throw new Error("bad-request: Password must not exceed 72 UTF-8 bytes");
    }
    const image = decodeProfileImage(imageStringBase64, imageFileExtension);
    const imageDAO = this.daoFactory.getImageDAO();
    const passwordHash = await hash(password, 10);
    const storedImage = await imageDAO.uploadImage(image);
    const user = new User(firstName, lastName, alias, storedImage.url);

    // The precheck avoids ordinary duplicate uploads; the atomic write handles races.
    // On a thrown storage error, the write outcome may be unknown: retain the image.
    const created = await userDAO.createUser(user, passwordHash);
    if (!created) {
      try {
        await imageDAO.deleteImage(storedImage.id);
      } catch (error) {
        throw new Error("internal-server-error: Duplicate registration image cleanup failed", { cause: error });
      }
      throw new Error("bad-request: Alias already registered");
    }
    // Once saved, keep the account/photo if session issuance fails; login can retry.
    return [user, await this.issueSession(user.alias)];
  }
}
