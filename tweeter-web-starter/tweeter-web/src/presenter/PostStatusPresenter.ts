import { User, AuthToken, Status } from "tweeter-shared";
import { MessageView, Presenter } from "./Presenter";

export interface PostStatusPresenterView extends MessageView{
  authToken: AuthToken;
  displayedUser: User;
  isLoading: boolean;
  post: string;
  setPost: (post: string) => void;
}

export class PostStatusPresenter extends Presenter<PostStatusPresenterView>{

    constructor(view: PostStatusPresenterView) {
        super(view);
    }

public submitPost = async (event: React.MouseEvent) => {
    event.preventDefault();

    var postingStatusToastId = "";

    try {
      await this.doFailureReportingOperation( async () => {
      this.view.setIsLoading(true);
      postingStatusToastId = this.view.displayInfoMessage(
        "Posting status...",
        0,
      );
      
      const status = new Status(this.view.post, this.view.displayedUser!, Date.now());

      await this.postStatus(this.view.authToken, status);

      this.clearPost(event);
      this.view.displayInfoMessage("Status posted!", 2000);
      }, "post the status")

      } finally {
      this.view.deleteMessage(postingStatusToastId);
      this.view.setIsLoading(false);
    }
  };


  private postStatus = async (
    authToken: AuthToken,
    newStatus: Status,
  ): Promise<void> => {
    // Pause so we can see the logging out message. Remove when connected to the server
    await new Promise((f) => setTimeout(f, 2000));
    // TODO: Call the server to post the status
  };

  public clearPost = (event: React.MouseEvent) => {
    event.preventDefault();
    this.view.setPost("");
  };

  public checkButtonStatus = (post: string, authToken : AuthToken, 
    displayedUser : User, isLoading : boolean) => {
    return !post.trim() || !authToken || !displayedUser || isLoading;
  };
}