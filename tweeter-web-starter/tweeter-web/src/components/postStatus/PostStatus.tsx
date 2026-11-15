import "./PostStatus.css";
import { useRef, useState } from "react";
import { useMessageActions } from "../toaster/MessageHooks";
import { useUserInfoHook } from "../userInfo/UserInfoHooks";
import { PostStatusPresenter, PostStatusView } from "../../presenter/PostStatusPresenter";
import { AuthToken } from "tweeter-shared/dist/model/domain/AuthToken";
import { User } from "tweeter-shared/dist/model/domain/User";


 interface Props {  // Added for testing purposes
    presenter? : PostStatusPresenter
  }

const PostStatus = (props? : Props) => {
  const {displayErrorMessage, displayInfoMessage, deleteMessage } = useMessageActions()
  const {currentUser, authToken} = useUserInfoHook();
  const [post, setPost] = useState("");
  const [isLoading, setIsLoading] = useState(false);
 

  const listener : PostStatusView = {
      displayErrorMessage : displayErrorMessage,
      displayInfoMessage : displayInfoMessage,
      deleteMessage : deleteMessage,
      authToken: authToken!,
      setIsLoading: setIsLoading,
      isLoading: isLoading,
      post: post,
      setPost: setPost,
  };
  
  const presenterRef = useRef<PostStatusPresenter | null>(null);
  if (!presenterRef.current) {
      presenterRef.current = props?.presenter ?? (new PostStatusPresenter(listener))
    }


  const checkButtonStatus = (post: string, authToken : AuthToken, 
    displayedUser : User, isLoading : boolean) => {
    return !post.trim() || !authToken || !displayedUser || isLoading;
  };
  
  
  return (
    <form>
      <div className="form-group mb-3">
        <textarea
          className="form-control"
          id="postStatusTextArea"
          rows={10}
          aria-label="post status text area"
          placeholder="What's on your mind?"
          value={post}
          onChange={(event) => {
            setPost(event.target.value);
          }}
        />
      </div>
      <div className="form-group">
        <button
          id="postStatusButton"
          className="btn btn-md btn-primary me-1"
          type="button"
          disabled={checkButtonStatus(post, authToken!, currentUser!, isLoading )}
          style={{ width: "8em" }}
          onClick={(event) =>presenterRef.current?.submitPost(post, currentUser!, authToken!, event)}
          >
          {isLoading ? (
            <span
              className="spinner-border spinner-border-sm"
              role="status"
              aria-hidden="true"
            ></span>
          ) : (
            <div>Post Status</div>
          )}
        </button>
        <button
          id="clearStatusButton"
          className="btn btn-md btn-secondary"
          aria-label = "clear status button"
          type="button"
          disabled={checkButtonStatus(post, 
            authToken!, currentUser!, isLoading)}
          onClick={(event) => {presenterRef.current?.clearPost(event)}}
        >
          Clear
        </button>
      </div>
    </form>
  );
};

export default PostStatus;

