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
      authToken: AuthToken,
      user: User,
    ): Promise<number> => {
      // TODO: Replace with the result of calling server
      return FakeData.instance.getFollowerCount(user.alias);
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
    const [items, hasMore] = FakeData.instance.getPageOfUsers(this.getDomainObject(lastItem), pageSize, userAlias);
    const dtos = items.map((user) => this.createDto(user));
    return [dtos, hasMore];
  }

  private createDto(user: User) : UserDto {
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      alias: user.alias,
      imageUrl: user.imageUrl,
    }
  }

    private getDomainObject(dto: UserDto | null) : User | null {
     return dto == null ? null : new User(dto.firstName, dto.lastName, dto.alias, dto.imageUrl);

    }
 

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