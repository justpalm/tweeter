import { useState, useEffect, useRef } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { User } from "tweeter-shared";
import { useParams } from "react-router-dom";
import UserItem from "../userItem/UserItem";
import { useMessageActions } from "../toaster/MessageHooks";
import { useUserInfoActionHook, useUserInfoHook } from "../userInfo/UserInfoHooks";
import { UserItemPresenter } from "../../presenter/UserItemPresenter";
import { PagedItemView } from "../../presenter/PagedItemPresenter";

interface Props {
    featureURL: string, 
    presenterFactory: (listener : PagedItemView<User>) => UserItemPresenter
}

export class ItemScroller {

  private props : Props | undefined;

  constrcutor (props: Props) {
    this.props = props;
  };

  public ItemScroller = () => {

  const { displayErrorMessage } = useMessageActions();
  const [items, setItems] = useState<User[]>([]);
  const { displayedUser, authToken } = useUserInfoHook();
  const { setDisplayedUser } = useUserInfoActionHook();
  const { displayedUser: displayedUserAliasParam } = useParams();

  const listener: PagedItemView<User> = {
    addItems: (newItems: User[]) => {
    setItems((previousItems) => [...previousItems, ...newItems]);
    },
    displayErrorMessage: displayErrorMessage
  };


  const presenterRef = useRef<UserItemPresenter | null>(null)
  if(presenterRef.current === null) {
    presenterRef.current = this.props.presenterFactory(listener)
  };
  //The presenter never rerenders, hence this whole null logic. It remebers what it's previous values was,
  //basically it makes sure that if null does exist, it doens't make it go back.


  // Update the displayed user context variable whenever the displayedUser url parameter changes. This allows browser forward and back buttons to work correctly.
  useEffect(() => {
    if (
      authToken &&
      displayedUserAliasParam &&
      displayedUserAliasParam != displayedUser!.alias
    ) {
       presenterRef.current!.getUser(authToken!, displayedUserAliasParam!).then((toUser) => {
        if (toUser) {
          setDisplayedUser(toUser);
        }
      });
    }
  }, [displayedUserAliasParam]);

  // Initialize the c omponent whenever the displayed user changes
  useEffect(() => {
    reset();
    loadMoreItems();
  }, [displayedUser]);

  const reset = async () => {
    setItems(() => []);
    presenterRef.current!.reset();  //We know it won't be null since we have that whole check, so we "!"
  };

  const loadMoreItems = async () => {
    presenterRef.current!.loadMoreItems(authToken!, displayedUser!.alias);
  };

  return (
    <div className="container px-0 overflow-visible vh-100">
      <InfiniteScroll
        className="pr-0 mr-0"
        dataLength={items.length}
        next={loadMoreItems}
        hasMore={presenterRef.current!.hasMoreItems}
        loader={<h4>Loading...</h4>}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className="row mb-3 mx-0 px-0 border rounded bg-white"
          >
            <UserItem user={item} featurePath={this.props.featureURL} />
          </div>
        ))}
      </InfiniteScroll>
    </div>
  );
  }
}
