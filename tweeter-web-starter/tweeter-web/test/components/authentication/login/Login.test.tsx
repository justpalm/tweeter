import { MemoryRouter } from "react-router-dom";
import Login from "../../../../src/components/authentication/login/Login"
import { render, screen } from "@testing-library/react";
import { LoginPresenter, LoginView } from "../../../../src/presenter/LoginPresenter";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

describe ("Login Component", () => {
    
    it ("starts with the sign-in button is disabled.", () => {
        const { signInButton } = renderLoginandGetElemnt("/")
        expect (signInButton).toBeDisabled
           
    
    
    })
})


function renderLogin(originalUrl : string) {

    return render(
        <MemoryRouter>
            <Login originalUrl={originalUrl}
            presenterFactory = {(view: LoginView) => new LoginPresenter(view)} 
            />
        </MemoryRouter>

    )

}

function renderLoginandGetElemnt(originalUrl : string) {
    const user = userEvent.setup

    renderLogin(originalUrl);

    const signInButton = screen.getByRole("button", {name  : /Sign in/})
    const aliasField = screen.getByLabelText("alias")
    const passwordField = screen.getAllByLabelText("password")

    return {user, signInButton, aliasField, passwordField}


}