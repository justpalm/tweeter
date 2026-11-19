import { Buffer } from "buffer";
import { AuthToken, User } from "tweeter-shared";
import { Service } from "./Service";
import { ServerFacade } from "../model/net/ServerFacade";

export class UserService implements Service {
  private serverFacade = new ServerFacade();

  // AI-assisted: see AI-ATTRIBUTION.md
  public async getUser (
    authToken: AuthToken,
    alias: string
  ): Promise<User | null> {
    return this.serverFacade.getUser({ token: authToken.token, alias });
  };


  // AI-assisted: see AI-ATTRIBUTION.md
  public logout = async (authToken: AuthToken): Promise<void> => {
    return this.serverFacade.logout({ token: authToken.token });
  };


  // AI-assisted: see AI-ATTRIBUTION.md
  public async login(
    alias: string,
    password: string
  ): Promise<[User, AuthToken]> {
    return this.serverFacade.login({ alias, password });
  }

  // AI-assisted: see AI-ATTRIBUTION.md
  public async register(
    firstName: string,
    lastName: string,
    alias: string,
    password: string,
    userImageBytes: Uint8Array,
    imageFileExtension: string,
  ): Promise<[User, AuthToken]> {
    const imageStringBase64 = Buffer.from(userImageBytes).toString("base64");
    return this.serverFacade.register({
      firstName, lastName, alias, password, imageStringBase64, imageFileExtension,
    });
  }
}
