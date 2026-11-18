// AI-assisted: see AI-ATTRIBUTION.md
import { AuthToken, User } from "tweeter-shared";
import { Service } from "./Service";
import { ServerFacade } from "../model/net/ServerFacade";

export class FollowService implements Service {
  private readonly serverFacade = new ServerFacade();


    public isFollowing = async (
      authToken: AuthToken,
      follower: User,
      followee: User,
    ): Promise<boolean> => {
      return this.serverFacade.isFollowing({
        token: authToken.token,
        followerAlias: follower.alias,
        followeeAlias: followee.alias,
      });
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
    return this.serverFacade.follow({
      token: authToken.token,
      userAlias: userToFollow.alias,
    });
  };


  public unfollow = async (
    authToken: AuthToken,
    userToUnfollow: User,
  ): Promise<[followerCount: number, followeeCount: number]> => {
    return this.serverFacade.unfollow({
      token: authToken.token,
      userAlias: userToUnfollow.alias,
    });
  };



    
}
