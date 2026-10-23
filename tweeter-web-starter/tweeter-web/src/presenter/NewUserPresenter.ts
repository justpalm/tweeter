import { User } from "tweeter-shared/dist/model/domain/User";
import { LoginView } from "./LoginPresenter";
import { Presenter } from "./Presenter";
import { RegisterView } from "./RegisterPresenter";
import { AuthToken } from "tweeter-shared/dist/model/domain/AuthToken";

export class NewUserPresenter<T extends LoginView | RegisterView> extends Presenter<T>{
    constructor(view: T) {
        super(view);
    }

    public async enteringUser(
    errorDescription : string,
    rememberMe : boolean,
    operation : () => Promise<[User, AuthToken]>) : Promise<void> {

    await this.doFailureReportingOperation(
    async () => {
    this.view.setIsLoading(true);

    const [user, authToken] = await operation();

    this.view.updateUserInfo(user, user, authToken, rememberMe);

    if (`originalUrl` in this.view && !!this.view.originalUrl) {
        this.view.navigate(this.view.originalUrl);
    } else {
        this.view.navigate(`/feed/${user.alias}`);
    }
    }, errorDescription), () => {this.view.setIsLoading(false)}
    }
}