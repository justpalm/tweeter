import { User, AuthToken, Status } from "tweeter-shared";
import { MessageView, Presenter } from "./Presenter";
import { StatusService } from "../model.service/StatusService";

export interface PostStatusPresenterView extends MessageView{
  authToken: AuthToken;
  displayedUser: User;
  isLoading: boolean;
  post: string;
  setPost: (post: string) => void;
  setIsLoading: (IsLoading: boolean) => void;
}

export class PostStatusPresenter extends Presenter<PostStatusPresenterView>{

  private service = new StatusService();

    constructor(view: PostStatusPresenterView) {
        super(view);
    }

public submitPost = async (event: React.MouseEvent) => {
    event.preventDefault();

    var postingStatusToastId = "";

    this.doFailureReportingOperation( async () => {
      this.view.setIsLoading(true);
      postingStatusToastId = this.view.displayInfoMessage(
        "Posting status...",
        0,
      );
      
      const status = new Status(this.view.post, this.view.displayedUser!, Date.now());
      await this.service.postStatus(this.view.authToken, status);

      this.clearPost(event);
      this.view.displayInfoMessage("Status posted!", 2000);

      }, "post the status", async () => {
      this.view.deleteMessage(postingStatusToastId);
      this.view.setIsLoading(false);})
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