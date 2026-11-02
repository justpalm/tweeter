import { AuthToken } from "tweeter-shared";
import { anything, instance, mock, spy, verify, when} from "@typestrong/ts-mockito";
import { beforeEach, describe, expect, it } from "@jest/globals";
import { PostStatusView, PostStatusPresenter } from "../../src/presenter/PostStatusPresenter";
import { StatusService } from "../../src/model.service/StatusService";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostStatus from "../../src/components/postStatus/PostStatus";
import "@testing-library/jest-dom";




    // let mockPostStatusViewPresenterView : PostStatusView;
    // let PostStatusViewPresenter: PostStatusPresenter;
    // let mockService : StatusService

describe ("PostStatusPresenter" , () => {
    
    let mockPostStatusViewPresenter : PostStatusView;
    let PostStatusViewPresenter: PostStatusPresenter;
    let mockService : StatusService

    
    const user = userEvent.setup();
    render(<PostStatus />);
    
    
    beforeEach(() => {
        mockPostStatusViewPresenter = mock<PostStatusView>();
        const mockPostStatusPresenterViewInstance = instance(mockPostStatusViewPresenter);

        
        const postStatusPresenterSpy = spy(new PostStatusPresenter(mockPostStatusPresenterViewInstance));
        PostStatusViewPresenter = instance(postStatusPresenterSpy);


        mockService = mock<StatusService>()   
        when(postStatusPresenterSpy.service).thenReturn(instance(mockService));

    })

    it(" tells the view to display a posting status message.", async () =>{
        const button = document.getElementById("postStatusButton")! as HTMLButtonElement
        console.log("disabled:", button.disabled);
        await user.click(document.getElementById("postStatusButton")!);
        verify(mockPostStatusViewPresenter.displayInfoMessage(anything(), 0)).once();
        // 
    })


    // it("calls postStatus on the post status service with the correct status string and auth token.", async() => {
    //     await PostStatusViewPresenter.logOut(authToken);
    //     verify(mockService.logout(authToken)).once();

    //     let [capturedAuthToken] = capture(mockService.logout).last();
    //     expect(capturedAuthToken).toEqual(authToken)

    // })

    // it ("tells the view to clear the info message that was displayed previously, clear the post, and display a status posted message.", async() => {
    //     await PostStatusViewPresenter.logOut(authToken);

    //     verify(mockPostStatusViewPresenterView.deleteMessage(anything())).once();
    //     verify(mockPostStatusViewPresenterView.clearUserInfo()).once();
    //     verify(mockPostStatusViewPresenterView.navigate("/login")).once();         
    // } )

    // it (" tells the view to clear the info message and display an error message but does not tell it to clear the post or display a status posted message", async () => {
    //     let error = new Error("An error occurred");
    //     when(mockService.logout(anything())).thenThrow(error);

    //     await PostStatusViewPresenter.logOut(authToken);

    //     let [errorString] = capture(mockPostStatusViewPresenterView.displayErrorMessage).last();
    //     verify(mockPostStatusViewPresenterView.displayErrorMessage("Failed to log user out because of exception: An error occurred")).once();
    // })

});



