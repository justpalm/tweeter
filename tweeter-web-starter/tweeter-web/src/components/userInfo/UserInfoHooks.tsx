import { useContext } from "react";
import { UserInfoActionsContext, UserInfoContext } from "./UserInfoContexts";

export const useUserInfoHook = () => {
    return useContext(UserInfoContext);
}

export const useUserInfoActionHook = () => {
    return useContext(UserInfoActionsContext)
}

