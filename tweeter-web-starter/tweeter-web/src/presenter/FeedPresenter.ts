import { AuthToken, Status} from "tweeter-shared";;
import { StatusItemPresenter } from "./StatusItemPresenter";
import { PagedItemView } from "./PagedItemPresenter";
import { PAGE_SIZE } from "../presenter/PagedItemPresenter";


export class FeedPresenter extends StatusItemPresenter {
    public constructor(view: PagedItemView<Status>) {
        super(view);
    }
      
    protected itemDescription(): string {
        return "load feed items"
    }
    protected getMoreItems(authToken: AuthToken, userAlisa: string) {
        return this.service.loadMoreFeedItems(authToken, userAlisa, PAGE_SIZE, this.lastItem)
    }
}