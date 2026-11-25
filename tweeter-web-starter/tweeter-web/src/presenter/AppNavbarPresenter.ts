// AI-assisted: see AI-ATTRIBUTION.md
import { UserService } from "../model.service/UserService";
import type { AuthToken } from "tweeter-shared";
import { MessageView, Presenter } from "./Presenter";

export interface AppNavbarView extends MessageView{ 
clearUserInfo: () => void;
navigate: (path: string) => void;
}  
  
export class AppNavbarPresenter extends Presenter<AppNavbarView> {
    private _service: UserService;

    constructor(view: AppNavbarView) {
        super(view);
        this._service = new UserService();
    }

    public get service() {
        return this._service;
    }

    public async logOut(authToken : AuthToken){
        const loggingOutToastId = this.view.displayInfoMessage("Logging Out...", 0);

        try {
            await this.service.logout(authToken);
        } catch (error) {
            // An expired/revoked session is already unusable. Other failures
            // still permit local logout, while reporting that revocation failed.
            const message = (error as Error).message;
            if (!message.includes("unauthorized:")) {
                this.view.displayErrorMessage(`Signed out on this device, but could not revoke the server session: ${message}`);
            }
        } finally {
            this.view.deleteMessage(loggingOutToastId);
            this.view.clearUserInfo();
            this.view.navigate("/login");
        }
    
    };
}
