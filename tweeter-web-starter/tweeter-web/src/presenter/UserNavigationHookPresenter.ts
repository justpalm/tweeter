import { AuthToken, User } from "tweeter-shared";
import { UserService } from "../model.service/UserService";
import { Presenter, View } from "./Presenter";


export interface UserNavigationHookView extends View{
    setDisplayedUser: (toUser: any) => void;
    navigate: (url: string) => void;
    authToken: AuthToken;
    displayedUser: User
}


export class UserNavigationHookPresenter extends Presenter<UserNavigationHookView> {
    private userService: UserService = new UserService();

    constructor(view : UserNavigationHookView) {
        super(view)
    }

    public navigateToUser = async (event : React.MouseEvent, featureUrl : string) => {
        
        const navigateToUser = async (event: React.MouseEvent, featureUrl : string) => {
            event.preventDefault();


            const extractAlias = (value: string): string => {
                const index = value.indexOf("@");
                return value.substring(index);
            };

            
            await this.doFailureReportingOperation(async () => {
            const alias = extractAlias(event.target.toString());
            const toUser = await this.userService.getUser(this.view.authToken!, alias);
            
            if (toUser) {
                if (!toUser.equals(this.view.displayedUser!)) {
                this.view.setDisplayedUser(toUser);
                this.view.navigate(`${featureUrl}/${toUser.alias}`);
                }
            }}, "get user")
                 
        }
        return navigateToUser(event, featureUrl);
    }
  }
