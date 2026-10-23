import { UserService } from "../model.service/UserService";
import type { AuthToken } from "tweeter-shared";
import { Presenter, View } from "./Presenter";

export interface LoginView extends View{ 
    setPassword: (password: string) => void;
    setAlias: (alias: string) => void;
    setIsLoading: (isLoading: boolean) => void;
    updateUserInfo : (user: any, authUser: any, authToken: AuthToken, rememberMe: boolean) => void;
    originalUrl?: string;
    navigate: (path: string) => void;
}  
  
export class LoginPresenter extends Presenter<LoginView>{
    private userService: UserService = new UserService();

    constructor(view: LoginView) {
        super(view);
    }

  public login = async (password : string, alias : string, rememberMe : boolean) => {
    try {
      await this.doFailureReportingOperation(
      async () => {
      this.view.setIsLoading(true);

      const [user, authToken] = await this.userService.login(alias, password);

      this.view.updateUserInfo(user, user, authToken, rememberMe);

      if (!!this.view.originalUrl) {
        this.view.navigate(this.view.originalUrl);
      } else {
        this.view.navigate(`/feed/${user.alias}`);
      }

      }, "log user in")
    } finally {
      this.view.setIsLoading(false);
    }
  };

}
