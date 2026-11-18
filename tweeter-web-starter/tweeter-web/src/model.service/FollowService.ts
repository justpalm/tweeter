// AI-assisted: see AI-ATTRIBUTION.md
import { AuthToken, FakeData, User } from "tweeter-shared";
import { Service } from "./Service";
import { ServerFacade } from "../model/net/ServerFacade";

export class FollowService implements Service {
  private readonly serverFacade = new ServerFacade();


    public getIsFollowerStatus = async (
      authToken: AuthToken,
      user: User,
      selectedUser: User,
    ): Promise<boolean> => {
      // TODO: Replace with the result of calling server
      return FakeData.instance.isFollower();
    };

    public getFolloweeCount = async (
      authToken: AuthToken,
      user: User,
    ): Promise<number> => {
      return this.serverFacade.getFolloweeCount({
        token: authToken.token,
        userAlias: user.alias,
      });
    };

    public getFollowerCount = async (
      authToken: AuthToken,
      user: User,
    ): Promise<number> => {
      return this.serverFacade.getFollowerCount({
        token: authToken.token,
        userAlias: user.alias,
      });
    };

    public async loadMoreFollowees (
      authToken: AuthToken,
      userAlias: string,
      pageSize: number,
      lastItem: User | null
    ): Promise<[User[], boolean]> {
      return this.serverFacade.getMoreFollowees({
        token: authToken.token,
        userAlias,
        pageSize,
        lastItem: lastItem?.dto ?? null,
      });
    };
    
    public async loadMoreFollowers (
        authToken: AuthToken,
        userAlias: string,
        pageSize: number,
        lastItem: User | null
      ): Promise<[User[], boolean]> {
        return this.serverFacade.getMoreFollowers({
          token: authToken.token,
          userAlias,
          pageSize,
          lastItem: lastItem?.dto ?? null,
        });
      };

    public follow = async (
    authToken: AuthToken,
    userToFollow: User,
  ): Promise<[followerCount: number, followeeCount: number]> => {
    // Pause so we can see the follow message. Remove when connected to the server
    await new Promise((f) => setTimeout(f, 2000));

    // TODO: Call the server

    const followerCount = await this.getFollowerCount(authToken, userToFollow);
    const followeeCount = await this.getFolloweeCount(authToken, userToFollow);

    return [followerCount, followeeCount];
  };


  public unfollow = async (
    authToken: AuthToken,
    userToUnfollow: User,
  ): Promise<[followerCount: number, followeeCount: number]> => {
    // Pause so we can see the unfollow message. Remove when connected to the server
    await new Promise((f) => setTimeout(f, 2000));

    // TODO: Call the server

    const followerCount = await this.getFollowerCount(authToken, userToUnfollow);
    const followeeCount = await this.getFolloweeCount(authToken, userToUnfollow);

    return [followerCount, followeeCount];
  };



    
}
