import "./UserInfoComponent.css";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMessageActions } from "../toaster/MessageHooks";
import { useUserInfoHook, useUserInfoActionHook } from "./UserInfoHooks";
import {
  UserInfoView,
  UserInfoPresenter,
} from "../../presenter/UserInfoPresenter";
import useUserNavigationHook from "../navigate/UserNavigationHooks";

const UserInfo = () => {
  const [isFollower, setIsFollower] = useState(false);
  const [followeeCount, setFolloweeCount] = useState(-1);
  const [followerCount, setFollowerCount] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const { displayInfoMessage, displayErrorMessage, deleteMessage } =
    useMessageActions();

  const { currentUser, authToken, displayedUser } = useUserInfoHook();
  const { setDisplayedUser } = useUserInfoActionHook();
  const location = useLocation();
  const { navigateToSpecifiedUser } = useUserNavigationHook();

  const listener: UserInfoView = {
    displayInfoMessage: displayInfoMessage,
    displayErrorMessage: displayErrorMessage,
    deleteMessage: deleteMessage,
    setIsFollower: setIsFollower,
    setFolloweeCount: setFolloweeCount,
    setFollowerCount: setFollowerCount,
  };

  const presenterRef = useRef<UserInfoPresenter | null>(null);
  if (presenterRef.current === null) {
    presenterRef.current = new UserInfoPresenter(listener);
  }

  if (!displayedUser) {
    console.log("asdhjasdfa")
    setDisplayedUser(currentUser!);
  }

  useEffect(() => {
    presenterRef.current!.getIsFollowerStatus(
      authToken!,
      currentUser!,
      displayedUser!
    );
    console.log("asdhjasdfa")
    presenterRef.current!.getFolloweeCount(authToken!, displayedUser!);
    presenterRef.current!.getFollowerCount(authToken!, displayedUser!);
  }, [displayedUser]);

  const getBaseUrl = (): string => {
    const segments = location.pathname.split("/@");
    return segments.length > 1 ? segments[0] : "/";
  };  
  
  const switchToLoggedInUser = (event: React.MouseEvent): void => {
    event.preventDefault();
    let featureUrl : string = `${getBaseUrl()}/${currentUser!.alias}`
    navigateToSpecifiedUser(featureUrl);
  };

  const followDisplayedUser = async (
    event: React.MouseEvent
  ): Promise<void> => {
    event.preventDefault();

    try {
      setIsLoading(true);
      presenterRef.current!.followUser(authToken!, displayedUser!);
    } finally {
      setIsLoading(false);
    }
  };

  const unfollowDisplayedUser = async (
    event: React.MouseEvent
  ): Promise<void> => {
    event.preventDefault();

    try {
      setIsLoading(true);
      presenterRef.current!.unfollowUser(authToken!, displayedUser!);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {currentUser === null || displayedUser === null || authToken === null ? (
        <></>
      ) : (
        <div className="container">
          <div className="row">
            <div className="col-auto p-3">
              <img
                src={displayedUser.imageUrl}
                className="img-fluid"
                width="100"
                alt="Posting user"
              />
            </div>
            <div className="col p-3">
              {!displayedUser.equals(currentUser) && (
                <p id="returnToLoggedInUser">
                  Return to{" "}
                  <Link
                    to={`./${currentUser.alias}`}
                    onClick={switchToLoggedInUser}
                  >
                    logged in user
                  </Link>
                </p>
              )}
              <h2>
                <b>{displayedUser.name}</b>
              </h2>
              <h3>{displayedUser.alias}</h3>
              <br />
              {followeeCount > -1 && followerCount > -1 && (
                <div>
                  Followees: {followeeCount} Followers: {followerCount}
                </div>
              )}
            </div>
            <form>
              {!displayedUser.equals(currentUser) && (
                <div className="form-group">
                  {isFollower ? (
                    <button
                      id="unFollowButton"
                      className="btn btn-md btn-secondary me-1"
                      type="submit"
                      style={{ width: "6em" }}
                      onClick={unfollowDisplayedUser}
                    >
                      {isLoading ? (
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                        ></span>
                      ) : (
                        <div>Unfollow</div>
                      )}
                    </button>
                  ) : (
                    <button
                      id="followButton"
                      className="btn btn-md btn-primary me-1"
                      type="submit"
                      style={{ width: "6em" }}
                      onClick={followDisplayedUser}
                    >
                      {isLoading ? (
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                        ></span>
                      ) : (
                        <div>Follow</div>
                      )}
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UserInfo;