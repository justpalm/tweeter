import { MemoryRouter } from "react-router-dom";
import PostStatus from "../../../../src/components/postStatus/PostStatus"
import { render, screen } from "@testing-library/react";
import { PostStatusPresenter, PostStatusView } from "../../../../src/presenter/PostStatusPresenter";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import "@testing-library/jest-dom";
import { anything, instance, mock, verify } from "@typestrong/ts-mockito";
import { useUserInfoHook } from "../../../../src/components/userInfo/UserInfoHooks";
import { AuthToken, User } from "tweeter-shared";



library.add(fab);

jest.mock("../../../../src/components/userInfo/UserInfoHooks", () => ({
  ...jest.requireActual("../../../../src/components/userInfo/UserInfoHooks"),
  __esModule: true,
  useUserInfoHook: jest.fn(),
}));


describe ("PostStatusComponent" , () => {


    const mockAuthToken = new AuthToken("abc123", Date.now());
    const mockUser = new User("Justin", "P", "anything", "a");
    const post = "Hello world!";

    beforeAll(() => {


        (useUserInfoHook as jest.Mock).mockReturnValue({
        currentUser: mockUser,
        authToken: mockAuthToken,
        });

    })

       it ("starts with the sign-in and clear buttons disabled.", () => {
        const { postButton, clearPostButton } = renderPostStatusandGetElement()
        expect (postButton).toBeDisabled();
        expect (clearPostButton).toBeDisabled();
        });
    
    
        it ("checks that both buttons are enabled" +
            " when the text field is filled.", async () => {
            //Typing in
            return basicPost(post);
        });
               
        
        it ("checks if both buttons are disable when the text field is cleared", async () => {
            //Typing in
            const {user, postButton, clearPostButton} = await basicPost(post);

            //Hits clear button, checks if buttons are disabled
            await user.click(clearPostButton);
            expect (postButton).toBeDisabled();
            expect (clearPostButton).toBeDisabled();
        });
    
        it("ensure that the postStatus method is called with correct parameters when the Post Status button is pressed.", async() =>{
            //sets up mocks
            const mockPresenter = mock<PostStatusPresenter>();
            const mockPresenterInstance = instance(mockPresenter);
            
            //set ups variables
            const {user, postButton} = await basicPost(post, mockPresenterInstance)
            await user.click(postButton);
            
            //checks parameters
            verify(mockPresenter.submitPost(post, mockUser, mockAuthToken, anything())).once();
        });
    })
    
async function basicPost(post : string, presenter? : PostStatusPresenter) {

    //Gets the Elements and checks the buttons
    const { user, postButton, statusTextArea, clearPostButton} = renderPostStatusandGetElement(presenter);
    await user.type(statusTextArea, `${post}`);
    expect (postButton).toBeEnabled();
    expect (clearPostButton).toBeEnabled();

    return {user, postButton, statusTextArea, clearPostButton}   
}


function renderPostBox(presenter? : PostStatusPresenter) {

    render(
        <MemoryRouter> 
            {!!presenter ?
            (<PostStatus
            presenter = {presenter}
            />)
            :
            (<PostStatus
            />)
            }
        </MemoryRouter>
        )
    }

function renderPostStatusandGetElement(presenter? : PostStatusPresenter) {
    const user = userEvent.setup()

    renderPostBox(presenter);

    const postButton = screen.getByRole("button", {name  : /Post Status/})

    const statusTextArea = screen.getByLabelText("post status text area")
    const clearPostButton = screen.getByLabelText("clear status button")

    return {user, postButton, statusTextArea, clearPostButton}
}