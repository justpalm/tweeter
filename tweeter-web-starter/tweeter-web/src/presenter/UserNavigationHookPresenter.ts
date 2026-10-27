
import { AuthToken, User } from "tweeter-shared";
import { UserService } from "../model.service/UserService";
import { Presenter, View } from "./Presenter";


export interface UserNavigationHookView extends View{
    navigate: (url: string) => void;
}


export class UserNavigationHookPresenter extends Presenter<UserNavigationHookView> {
    private userService: UserService = new UserService();

    constructor(view : UserNavigationHookView) {
        super(view)
    }

    public navigateToUser = async ( toUrl : string, authToken : AuthToken, currentUser : User) => {
        
            // event.preventDefault(); // Note
            // console.log(featureUrl);

            const extractFeaturePath = (toUrl : string) : string => {
                const urlObject = new URL(toUrl);
                return urlObject.pathname.replace(/\/@[^/]+$/, "")
            }


            const extractAlias = (value: string): string => {
                const index = value.indexOf("@");
                return value.substring(index);
            };

            // console.log("what about here?")
            await this.doFailureReportingOperation(async () => {
            const alias = extractAlias(toUrl.toString());
            const featureUrl = extractFeaturePath(toUrl);
            const toUser = await this.userService.getUser(authToken!, alias);

        
            if (toUser) {
                // console.log(toUser.name);
                // console.log(this.view.displayedUser.name); 
                if (!toUser.equals(currentUser)) {
                this.view.navigate(`${featureUrl}/${toUser.alias}`);
                }
            }}, "get user")
    }

    public async navigateToSpecifiedUser(toUrl : string) {
        this.view.navigate(toUrl)
    }
    
  }
