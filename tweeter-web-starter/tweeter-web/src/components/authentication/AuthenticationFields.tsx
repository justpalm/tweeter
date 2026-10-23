import { Dispatch, SetStateAction, useRef, useState } from "react";
import { LoginPresenter, LoginView } from "../../presenter/LoginPresenter";
import { RegisterPresenter, RegisterView } from "../../presenter/RegisterPresenter";


interface Props {
  setPassword: Dispatch<SetStateAction<string>>;  
  setAlias: Dispatch<SetStateAction<string>>;  
  alias: string;
  password: string;
  originalUrl?: string;
  fuctiontype: string;
  loginListener?: LoginView;
  registerListener?: RegisterView;
  rememberMe : boolean;
}

const AuthenticationFields = (props : Props) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [imageBytes, setImageBytes] = useState<Uint8Array>(new Uint8Array());
  const [imageFileExtension, setImageFileExtension] = useState<string>("");

  const checkSubmitButtonStatus = (): boolean => {
    return !props.alias || !props.password;
  };

  const loginOnEnter = (event: React.KeyboardEvent<HTMLElement>) => {
  if (event.key == "Enter" && !checkSubmitButtonStatus()) {
    const loginPresenter : LoginPresenter = new LoginPresenter(props.loginListener!)
    loginPresenter.login(props.password, props.alias, props.rememberMe)
  }
  };

  const registerOnEnter = (event: React.KeyboardEvent<HTMLElement>) => {
  if (event.key == "Enter" && !checkSubmitButtonStatus()) {
    const registerPresenter : RegisterPresenter = new RegisterPresenter(props.registerListener!)
    registerPresenter.register(
      firstName,
      lastName,
      props.alias,
      props.password,
      imageBytes,
      imageFileExtension,
      props.rememberMe)
  }
  };

  const onEnter = (functiontype : string, event: React.KeyboardEvent<HTMLElement>) => {
     switch (functiontype) {
      case 'login':
        return loginOnEnter(event);
      case 'register':
        return registerOnEnter(event);
    }
  }

  return (
  <>
        <div className="form-floating">
          <input
            type="text"
            className="form-control"
            size={50}
            id="aliasInput"
            placeholder="name@example.com"
            onKeyDown={(event) => onEnter(props.fuctiontype, event)}
            onChange={(event) => props.setAlias(event.target.value)}
          />
          <label htmlFor="aliasInput">Alias</label>
        </div>
        <div className="form-floating mb-3">
          <input
            type="password"
            className="form-control bottom"
            id="passwordInput"
            placeholder="Password"
            onKeyDown={(event) => onEnter(props.fuctiontype, event)}
            onChange={(event) => props.setPassword(event.target.value)}
          />
          <label htmlFor="passwordInput">Password</label>
        </div>
      </>
  )
}

export default AuthenticationFields
