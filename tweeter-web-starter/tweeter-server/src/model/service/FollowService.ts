import { FakeData, User, UserDto } from "tweeter-shared";


export class FollowService {

    public async isFollowing(
      token: string,
      followerAlias: string,
      followeeAlias: string,
    ): Promise<boolean> {
      // Milestone 3 dummy data; persistence will use the aliases later.
      return FakeData.instance.isFollower();
    }

    public getFolloweeCount = async (
      token: string,
      userAlias: string,
    ): Promise<number> => {
      return FakeData.instance.getFolloweeCount(userAlias);
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

 

  public async follow(
    token: string,
    userAlias: string,
  ): Promise<[followerCount: number, followeeCount: number]> {
    // Milestone 3 returns dummy counts; persisting the follow is a later milestone.
    const followerCount = await this.getFollowerCount(token, userAlias);
    const followeeCount = await this.getFolloweeCount(token, userAlias);

    return [followerCount, followeeCount];
  }


  public async unfollow(
    token: string,
    userAlias: string,
  ): Promise<[followerCount: number, followeeCount: number]> {
    // Milestone 3 returns dummy counts; persisting the unfollow is a later milestone.
    const followerCount = await this.getFollowerCount(token, userAlias);
    const followeeCount = await this.getFolloweeCount(token, userAlias);

    return [followerCount, followeeCount];
  }



    
}
