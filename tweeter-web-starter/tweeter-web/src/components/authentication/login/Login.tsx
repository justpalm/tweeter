import "./Login.css";
import "bootstrap/dist/css/bootstrap.css";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthenticationFormLayout from "../AuthenticationFormLayout";
import AuthenticationtFields from "../AuthenticationFields";
import { useMessageActions } from "../../toaster/MessageHooks";
import { useUserInfoActionHook } from "../../userInfo/UserInfoHooks";
import { LoginPresenter, LoginView } from "../../../presenter/LoginPresenter";

interface Props {
  originalUrl?: string;
  presenterFactory: (view : LoginView) => LoginPresenter;
}

const Login = (props: Props) => {
  const [alias, setAlias] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { updateUserInfo } = useUserInfoActionHook();
  const { displayErrorMessage } = useMessageActions();
  



  const listener : LoginView = {  
    setPassword : setPassword,
    setAlias : setAlias,
    setIsLoading: setIsLoading,
    updateUserInfo : updateUserInfo,
    originalUrl: props.originalUrl,
    navigate : navigate,
    displayErrorMessage: displayErrorMessage,
  }

  const presenterRef = useRef<LoginPresenter | null>(null);
  if (presenterRef.current === null) {
    presenterRef.current = props.presenterFactory(listener);
  }




  const checkSubmitButtonStatus = (): boolean => {
    return !alias || !password;
  };


  const inputFieldFactory = () => {
    return (
      <>
        <AuthenticationtFields originalUrl = {props.originalUrl} alias = {alias} setAlias={setAlias} 
        password={password} setPassword={setPassword} fuctiontype={"/register"}
        loginListener={listener} rememberMe = {rememberMe}/>
      </>
    );
  };

  const switchAuthenticationMethodFactory = () => {
    return (
      <div className="mb-3">
        Not registered? <Link to="/register">Register</Link>
      </div>
    );
  };

  return (
    <AuthenticationFormLayout
      headingText="Please Sign In"
      submitButtonLabel="Sign in"
      oAuthHeading="Sign in with:"
      inputFieldFactory={inputFieldFactory}
      switchAuthenticationMethodFactory={switchAuthenticationMethodFactory}
      setRememberMe={setRememberMe}
      submitButtonDisabled={checkSubmitButtonStatus}
      isLoading={isLoading}
      submit={() => presenterRef.current!.login(password, alias, rememberMe)}
    />
  );
};

export default Login;
