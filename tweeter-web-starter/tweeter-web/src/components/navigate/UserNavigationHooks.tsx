import { useNavigate } from "react-router-dom";
import { useMessageActions } from "../toaster/MessageHooks";
import { useUserInfoActionHook, useUserInfoHook } from "../userInfo/UserInfoHooks";
import { UserNavigationHookPresenter, UserNavigationHookView } from "../../presenter/UserNavigationHookPresenter";
import { useRef } from "react";

const useUserNavigationHook = () => {
    const { displayErrorMessage } = useMessageActions();
    const { displayedUser, authToken } = useUserInfoHook();
    const { setDisplayedUser } = useUserInfoActionHook();
    const navigate = useNavigate();

    const listener : UserNavigationHookView = {
        setDisplayedUser,
        navigate,
        authToken: authToken!,
        displayErrorMessage,
    };

    const presenterRef = useRef<UserNavigationHookPresenter | null>(null);
    if (!presenterRef.current) {
        presenterRef.current = new UserNavigationHookPresenter(listener);
    }

    return {
       navigateToUser: presenterRef.current?.navigateToUser,
    };

}
export default useUserNavigationHook