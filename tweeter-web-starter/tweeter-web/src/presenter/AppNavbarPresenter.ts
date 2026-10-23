import { UserService } from "../model.service/UserService";
import type { AuthToken } from "tweeter-shared";
import { MessageView, Presenter } from "./Presenter";

export interface AppNavbarView extends MessageView{ 
clearUserInfo: () => void;
navigate: (path: string) => void;
}  
  
export class AppNavbarPresenter extends Presenter<AppNavbarView> {
    private userService: UserService = new UserService();

    constructor(view: AppNavbarView) {
        super(view);
    }

    public async logOut(authToken : AuthToken){
        const loggingOutToastId = this.view.displayInfoMessage("Logging Out...", 0);

        await this.doFailureReportingOperation(async () => {
    
        await this.userService.logout(authToken);

        this.view.deleteMessage(loggingOutToastId);
        this.view.clearUserInfo();
        this.view.navigate("/login");
        }, "log user out")
    
    };
}
