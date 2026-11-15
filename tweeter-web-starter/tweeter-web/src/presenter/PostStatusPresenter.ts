import { User, AuthToken, Status } from "tweeter-shared";
import { MessageView, Presenter } from "./Presenter";
import { StatusService } from "../model.service/StatusService";

export interface PostStatusView extends MessageView{
  authToken: AuthToken;
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


  public getStatus(post : string, displayedUser : User, time : number) {
    // console.log(`${time}`);
    return new Status(post, displayedUser!, time)
    }
  

  public submitPost = async (
    post : string, displayedUser : User, authToken : AuthToken,
    event?: React.MouseEvent, ) => 
    {
      event?.preventDefault();

      var postingStatusToastId = "";

      this.doFailureReportingOperation( async () => {
        this.view.setIsLoading(true);
        postingStatusToastId = this.view.displayInfoMessage(
          "Posting status...",
          0,
        );
        
        const status = this.getStatus(post, displayedUser!, Date.now());
        await this.service.postStatus(authToken, status);
        
        this.clearPost(event);
        this.view.displayInfoMessage("Status posted!", 2000);

        }, "post the status", async () => {
        this.view.deleteMessage(postingStatusToastId);
        this.view.setIsLoading(false);
      })
    };


  public clearPost = (event?: React.MouseEvent) => {
    event?.preventDefault();
    this.view.setPost("");
  };

}