import "./PostStatus.css";
import { useRef, useState } from "react";
import { useMessageActions } from "../toaster/MessageHooks";
import { useUserInfoHook } from "../userInfo/UserInfoHooks";
import { PostStatusPresenter, PostStatusPresenterView } from "../../presenter/PostStatusPresenter";
import { useNavigate } from "react-router";

const PostStatus = () => {
  const { displayErrorMessage, displayInfoMessage, deleteMessage } = useMessageActions()
  const { currentUser, authToken} = useUserInfoHook();
  const [post, setPost] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();


  const listener : PostStatusPresenterView = {
      navigate : navigate,
      displayErrorMessage : displayErrorMessage,
      displayInfoMessage : displayInfoMessage,
      deleteMessage : deleteMessage,
      authToken: authToken!,
      displayedUser: currentUser!,
      setIsLoading: setIsLoading,
      isLoading: isLoading,
      post: post,
      setPost: setPost,
      updateUserInfo(currentUser, displayedUser, authToken, remember) {},
  };
  
  const presenterRef = useRef<PostStatusPresenter | null>(null);
  if (!presenterRef.current) {
      presenterRef.current = new PostStatusPresenter(listener);
  }
  
  
  return (
    <form>
      <div className="form-group mb-3">
        <textarea
          className="form-control"
          id="postStatusTextArea"
          rows={10}
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
          disabled={presenterRef.current?.checkButtonStatus(post, authToken!, currentUser!, isLoading )}
          style={{ width: "8em" }}
          onClick={presenterRef.current?.submitPost}
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
          type="button"
          disabled={presenterRef.current?.checkButtonStatus(post, authToken!, currentUser!, isLoading)}
          onClick={presenterRef.current?.clearPost}
        >
          Clear
        </button>
      </div>
    </form>
  );
};

export default PostStatus;

