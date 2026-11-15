import { MemoryRouter } from "react-router-dom";
import Login from "../../../../src/components/authentication/login/Login"
import { render, screen } from "@testing-library/react";
import { LoginPresenter, LoginView } from "../../../../src/presenter/LoginPresenter";
import userEvent from "@testing-library/user-event";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import "@testing-library/jest-dom";
import { instance, mock, verify } from "@typestrong/ts-mockito";

library.add(fab);


describe ("Login Component", () => {
    

    it ("starts with the sign-in button is disabled.", () => {
        const { signInButton } = renderLoginandGetElemnt("/")
        expect (signInButton).toBeDisabled();
    });
    
    it ("enables the sign-in button when both the alias and password fields have text.", async () => {
        return basicLogin("a","a");
    });

    it( "disables the sign in button if either the alias or the passrof field is cleared", async() => {
        const {user, signInButton, aliasField, passwordField} = await basicLogin("a", "a");

        //clear 
        await user.clear(aliasField);
        expect(signInButton).toBeDisabled();

        //fill
        await user.type(aliasField, "a");
        expect (signInButton).toBeEnabled();

        //clear again
        await user.clear(passwordField);
        expect(signInButton).toBeDisabled();
    });

    it("ensure that the login method is called with correct parameters when the sign-in button is pressed.", async() =>{
        const mockPresenter = mock<LoginPresenter>();
        const mockPresenterInstance = instance(mockPresenter);

        const alias = "@alias";
        const password = "myPassword";

        const {user, signInButton} = 
        await basicLogin(alias, password, mockPresenterInstance)
        await user.click(signInButton);

        verify(mockPresenter.login(password, alias, false)).once();
    });
})


async function basicLogin(alias : string, password : string, presenter? : LoginPresenter) {
    
    //Fills in the alias and password fields normally, checking if the button is enabled
    //Will return the correct elements too
    const {user, signInButton, aliasField, passwordField} = renderLoginandGetElemnt("/", presenter)
    await user.type(aliasField, alias);
    await user.type(passwordField, password);
    expect (signInButton).toBeEnabled();

    return { user, signInButton, aliasField, passwordField };
}


function renderLogin(originalUrl : string, presenter? : LoginPresenter) {

    return render(
        <MemoryRouter>

            {
            !!presenter ? 

            (<Login originalUrl={originalUrl}
            presenterFactory = {(view: LoginView) => new LoginPresenter(view)}
            presenter = {presenter}
            />)
            : 
             (<Login originalUrl={originalUrl}
            presenterFactory = {(view: LoginView) => new LoginPresenter(view)} 
            />) 
            }           
        </MemoryRouter>
    )
}

function renderLoginandGetElemnt(originalUrl : string, presenter? : LoginPresenter) {
    const user = userEvent.setup()

    renderLogin(originalUrl, presenter);

    const signInButton = screen.getByRole("button", {name  : /Sign in/})
    const aliasField = screen.getByLabelText("alias")
    const passwordField = screen.getByLabelText("password")

    return {user, signInButton, aliasField, passwordField}
}
