import { AuthToken, User } from "tweeter-shared";
import { FollowService } from "../model.service/FollowService";
import { MessageView, Presenter, View } from "./Presenter";

export interface UserInfoView extends MessageView {
  setIsFollower: (isFollower: boolean) => void;
  setFolloweeCount: (count: number) => void;
  setFollowerCount: (count: number) => void;
}

export class UserInfoPresenter extends Presenter<UserInfoView>{
  private service: FollowService;

  public constructor(view: UserInfoView) {
    super(view);
    this.service = new FollowService();
  }

  public async getIsFollowerStatus(
    authToken: AuthToken,
    currentuser: User,
    displayedUser: User
  ) {
      await this.doFailureReportingOperation ( async () => {
      if (currentuser === displayedUser) {
        this.view.setIsFollower(false);
      } else {
        this.view.setIsFollower(
          await this.service.getIsFollowerStatus(authToken!, currentuser, displayedUser)
        );
      }
    }, "determine follower status")
  }

  public async getFolloweeCount(authToken: AuthToken, currentuser: User) {
    await this.doFailureReportingOperation( async () => {
      this.view.setFolloweeCount(
        await this.service.getFolloweeCount(authToken, currentuser)
      );
    }, "get followees count")
  }

  public async getFollowerCount(authToken: AuthToken, displayedUser: User) {
    await this.doFailureReportingOperation( async () => {
      this.view.setFollowerCount(
        await this.service.getFollowerCount(authToken, displayedUser)
      );
    }, "get follower count")

  }

  public async followUser(
    authToken: AuthToken,
    userToFollow: User
  ): Promise<void> {
    this.changeFollowStatus(
    `Following ${userToFollow!.name}...`,
    "follow user",
    true,
    () => {return this.service.follow(authToken, userToFollow)}
    )
  }

  public async unfollowUser(
    authToken: AuthToken,
    userToUnfollow: User
  ): Promise<void> {
    this.changeFollowStatus(
    `Unfollowing ${userToUnfollow!.name}...`,
    "unfollow user",
    false,
    () => {return this.service.unfollow(authToken, userToUnfollow)}
    )
  }

  public async changeFollowStatus(
  action: string,
  errorDescription : string,
  isFollower : boolean,
  operation : () => Promise<[number, number]>) : Promise<void> {

    var UserToast = "";

    this.doFailureReportingOperation(async () => {
      UserToast = this.view.displayInfoMessage(
        `${action}...`,
        0
      );

      const [followerCount, followeeCount] = await operation();

      this.view.setIsFollower(isFollower);
      this.view.setFollowerCount(followerCount);
      this.view.setFolloweeCount(followeeCount);
    }, errorDescription, async () => {this.view.deleteMessage(UserToast)})
 }

}


