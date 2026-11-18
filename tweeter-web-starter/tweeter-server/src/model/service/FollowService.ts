import { AuthToken, FakeData, User, UserDto } from "tweeter-shared";


export class FollowService {


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
      // TODO: Replace with the result of calling server
      return FakeData.instance.getFolloweeCount(user.alias);
    };

    public getFollowerCount = async (
      token: string,
      userAlias: string,
    ): Promise<number> => {
      return FakeData.instance.getFollowerCount(userAlias);
    };


  public async loadMoreFollowers(
    token: string,
    userAlias: string,
    pageSize: number,
    lastItem: UserDto | null
  ): Promise<[UserDto[], boolean]> {
    // TODO: Replace with the result of calling server
    return this.getFakeData(lastItem, pageSize, userAlias);
  }

  public async loadMoreFollowees(
    token: string,
    userAlias: string,
    pageSize: number,
    lastItem: UserDto | null
  ): Promise<[UserDto[], boolean]> {
    // TODO: Replace with the result of calling server
    return this.getFakeData(lastItem, pageSize, userAlias);
  }

  private async getFakeData(lastItem: UserDto | null, pageSize: number, userAlias: string) : Promise<[UserDto[], boolean]> {
    const [items, hasMore] = FakeData.instance.getPageOfUsers(User.fromDto(lastItem), pageSize, userAlias);
    const dtos = items.map((user) => user.dto);
    return [dtos, hasMore];
  }

 

    public follow = async (
    authToken: AuthToken,
    userToFollow: User,
  ): Promise<[followerCount: number, followeeCount: number]> => {
    // Pause so we can see the follow message. Remove when connected to the server
    await new Promise((f) => setTimeout(f, 2000));

    // TODO: Call the server

    const followerCount = await this.getFollowerCount(authToken.token, userToFollow.alias);
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

    const followerCount = await this.getFollowerCount(authToken.token, userToUnfollow.alias);
    const followeeCount = await this.getFolloweeCount(authToken, userToUnfollow);

    return [followerCount, followeeCount];
  };



    
}
