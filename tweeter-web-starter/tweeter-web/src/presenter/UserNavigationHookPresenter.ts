import { AuthToken, User } from "tweeter-shared";
import { UserService } from "../model.service/UserService";
import { Presenter, View } from "./Presenter";


export interface UserNavigationHookView extends View{
    setDisplayedUser: (toUser: any) => void;
    navigate: (url: string) => void;
    authToken: AuthToken;
}


export class UserNavigationHookPresenter extends Presenter<UserNavigationHookView> {
    private userService: UserService = new UserService();

    constructor(view : UserNavigationHookView) {
        super(view)
    }

    public navigateToUser = async (displayedUser : User, event : React.MouseEvent, featureUrl : string) => {
        
        const navigateToUser = async (displayedUser: User, event: React.MouseEvent, featureUrl : string) => {
            event.preventDefault();


            const extractAlias = (value: string): string => {
                const index = value.indexOf("@");
                return value.substring(index);
            };

            
            await this.doFailureReportingOperation(async () => {
            const alias = extractAlias(event.target.toString());
            const toUser = await this.userService.getUser(this.view.authToken!, alias);
            
            if (toUser) {
                if (!toUser.equals(displayedUser!)) {
                console.log("We made it here");
                this.view.setDisplayedUser(toUser);
                console.log(`${featureUrl}${toUser.alias}`);
                this.view.navigate(`${featureUrl}/${toUser.alias}`);
                }
            }}, "get user")
                 
        }
        return navigateToUser(displayedUser, event, featureUrl);
    }
  }
