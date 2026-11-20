import { AuthToken, User, FakeData } from "tweeter-shared";

export class UserService {

  // AI-assisted: see AI-ATTRIBUTION.md
  public async getUser (
    token: string,
    alias: string
  ): Promise<User | null> {
    // Milestone 3 uses dummy data; session verification comes later.
    return FakeData.instance.findUserByAlias(alias);
  };


  // AI-assisted: see AI-ATTRIBUTION.md
  public logout = async (token: string): Promise<void> => {
    // Milestone 3 acknowledges logout; persistent token invalidation comes later.
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
