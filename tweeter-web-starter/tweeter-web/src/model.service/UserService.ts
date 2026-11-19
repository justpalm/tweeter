import { Buffer } from "buffer";
import { AuthToken, User, FakeData } from "tweeter-shared";
import { Service } from "./Service";
import { ServerFacade } from "../model/net/ServerFacade";

export class UserService implements Service {
  private serverFacade = new ServerFacade();

  public async getUser (
    authToken: AuthToken,
    alias: string
  ): Promise<User | null> {
    // TODO: Replace with the result of calling server
    return FakeData.instance.findUserByAlias(alias);
  };


  public logout = async (authToken: AuthToken): Promise<void> => {
    // Pause so we can see the logging out message. Delete when the call to the server is implemented.
    await new Promise((res) => setTimeout(res, 1000));
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
