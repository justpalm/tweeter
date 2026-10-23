import { AuthToken } from "tweeter-shared/dist/model/domain/AuthToken";
import { UserService } from "../model.service/UserService";
import { Presenter, View } from "./Presenter";
import { Service } from "../model.service/Service";
import { User } from "tweeter-shared/dist/model/domain/User";
export const PAGE_SIZE = 10;


export interface PagedItemView<T> extends View {
    addItems : (newItems: T[]) => void;
}

export abstract class PagedItemPresenter<T, U extends Service> extends Presenter<PagedItemView<T>>  {
    private _service: U;
    private _hasMoreItems = true;
    private _lastItem: T | null = null;
    private userService = new UserService();

    public constructor(view: PagedItemView<T>) {
        super(view);
        this._service = this.serviceFactory();
    }

    protected abstract serviceFactory(): U

    protected get service() {
        return this._service;
    }

    protected get lastItem(): T | null {
        return this._lastItem;
    }
    protected set lastItem(value: T | null) {
        this._lastItem = value;
    }
    public get hasMoreItems(): boolean {
        return this._hasMoreItems;
    }
    protected set hasMoreItems(value: boolean) {
        this._hasMoreItems = value;
    }   

    reset() {
        this._lastItem = null;
        this._hasMoreItems = true;
    }
    
    public async loadMoreItems(authToken: AuthToken, userAlias: string) {
            await this.doFailureReportingOperation(async () => {
              const [newItems, hasMore] = await this.getMoreItems(
              authToken,
              userAlias,
            );
      
            this.hasMoreItems = hasMore;
            this.lastItem = newItems.length > 0 ? newItems[newItems.length - 1] : null;
            this.view.addItems(newItems);
    
            }, "load followers")
        };

    protected abstract itemDescription(): string; 

    protected abstract getMoreItems(authToken : AuthToken, userAlisa : string) : Promise<[T[], boolean]>

    public async getUser(
        authToken : AuthToken,
        alias : string
     ) : Promise<User | null> {
        return await this.userService.getUser(authToken, alias);
    }
   }
