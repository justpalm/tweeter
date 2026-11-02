import { User, AuthToken, Status } from "tweeter-shared";
import { MessageView, Presenter } from "./Presenter";
import { StatusService } from "../model.service/StatusService";

export interface PostStatusView extends MessageView{
  authToken: AuthToken;
  displayedUser: User;
  isLoading: boolean;
  post: string;
  setPost: (post: string) => void;
  setIsLoading: (IsLoading: boolean) => void;
}

export class PostStatusPresenter extends Presenter<PostStatusView>{

  private _service : StatusService;

    constructor(view: PostStatusView) {
        super(view);
        this._service = new StatusService();
    }


  public get service() {
    return this._service;
  }

  

  public submitPost = async (event: React.MouseEvent) => {
      console.log("HELLO")
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
    console.log("test", !post.trim() || !authToken || !displayedUser || isLoading)
    return !post.trim() || !authToken || !displayedUser || isLoading;
  };
}