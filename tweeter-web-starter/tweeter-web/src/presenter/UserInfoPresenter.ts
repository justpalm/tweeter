import { AuthToken, User } from "tweeter-shared";
import { FollowService } from "../model.service/FollowService";
import { MessageView, Presenter, View } from "./Presenter";

export interface UserInfoView extends MessageView {
  setDisplayedUser: (user: User) => void,
  setIsFollower: (isFollower: boolean) => void;
  setFolloweeCount: (count: number) => void;
  setFollowerCount: (count: number) => void;
  navigatetoUser : () => void;
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
      this.view.setFollowerCount(
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
    var followingUserToast = "";

    try {
      followingUserToast = this.view.displayInfoMessage(
        `Following ${userToFollow!.name}...`,
        0
      );

      const [followerCount, followeeCount] = await this.service.follow(
        authToken!,
        userToFollow!
      );

      this.view.setIsFollower(true);
      this.view.setFollowerCount(followerCount);
      this.view.setFolloweeCount(followeeCount);
    } catch (error) {
      this.view.displayErrorMessage(
        `Failed to follow user because of exception: ${error}`
      );
    } finally {
      this.view.deleteMessage(followingUserToast);
    }
  }

  public async unfollowUser(
    authToken: AuthToken,
    userToUnfollow: User
  ): Promise<void> {
    var unfollowingUserToast = "";

    try {
      unfollowingUserToast = this.view.displayInfoMessage(
        `Unfollowing ${userToUnfollow!.name}...`,
        0
      );

      const [followerCount, followeeCount] = await this.service.unfollow(
        authToken!,
        userToUnfollow!
      );

      this.view.setIsFollower(false);
      this.view.setFollowerCount(followerCount);
      this.view.setFolloweeCount(followeeCount);
    } catch (error) {
      this.view.displayErrorMessage(
        `Failed to unfollow user because of exception: ${error}`
      );
    } finally {
      this.view.deleteMessage(unfollowingUserToast);
    }
  }
}