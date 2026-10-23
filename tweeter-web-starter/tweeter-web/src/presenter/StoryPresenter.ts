import { AuthToken, Status} from "tweeter-shared";
import { StatusItemPresenter } from "./StatusItemPresenter";
import { PagedItemView } from "./PagedItemPresenter";
import { PAGE_SIZE } from "../presenter/PagedItemPresenter";

export class StoryPresenter extends StatusItemPresenter {
    public constructor(view: PagedItemView<Status>) {
        super(view);
    }
    protected itemDescription(): string {
      return "load feed"
    }
    protected getMoreItems(authToken: AuthToken, userAlisa: string) {
      return this.service.loadMoreStoryItems(authToken, userAlisa, PAGE_SIZE, this.lastItem);
    }
  }