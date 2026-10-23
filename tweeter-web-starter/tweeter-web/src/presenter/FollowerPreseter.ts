import { AuthToken, User} from "tweeter-shared";
import { UserItemPresenter } from "./UserItemPresenter";
import { PagedItemView } from "./PagedItemPresenter";
import { PAGE_SIZE } from "../presenter/PagedItemPresenter";

export class FollowerPresenter extends UserItemPresenter {

    public constructor(view: PagedItemView<User>) {
        super(view);
    }

    protected itemDescription(): string {
        return "load followers"
    }
    
    protected getMoreItems(authToken: AuthToken, userAlisa: string) {
        return this.service.loadMoreFollowers(authToken, userAlisa, PAGE_SIZE, this.lastItem)
    }
}