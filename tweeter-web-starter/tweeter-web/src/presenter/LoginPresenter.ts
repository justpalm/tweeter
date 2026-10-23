import { UserService } from "../model.service/UserService";
import type { AuthToken} from "tweeter-shared";
import { Presenter, View } from "./Presenter";
import { NewUserPresenter } from "./NewUserPresenter";

export interface LoginView extends View{ 
    setPassword: (password: string) => void;
    setAlias: (alias: string) => void;
    setIsLoading: (isLoading: boolean) => void;
    updateUserInfo : (user: any, authUser: any, authToken: AuthToken, rememberMe: boolean) => void;
    originalUrl?: string;
    navigate: (path: string) => void;
}  
  
export class LoginPresenter extends NewUserPresenter<LoginView>{
    private userService: UserService = new UserService();

    constructor(view: LoginView) {
        super(view);
    }

  public login = async (password : string, alias : string, rememberMe : boolean) => {
    this.enteringUser(
      "log user in",
      rememberMe,
      () => {return this.userService.login(alias, password)}
    )
  };
}
