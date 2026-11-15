import { AuthToken, User } from "tweeter-shared";
import { anything, capture, instance, mock, spy, verify, when} from "@typestrong/ts-mockito";
import { beforeEach, describe, it } from "@jest/globals";
import { PostStatusView, PostStatusPresenter } from "../../src/presenter/PostStatusPresenter";
import { StatusService } from "../../src/model.service/StatusService";
import "@testing-library/jest-dom";


describe ("PostStatusPresenter" , () => {
    
    let mockPostStatusPresenterView : PostStatusView;
    let postStatusPresenter: PostStatusPresenter;
    let mockService : StatusService

    const mockAuthToken = new AuthToken("abc123", Date.now());
    const mockUser = new User("Justin", "P", "anything", "a");
    const post = "Hello world!";
    
    
    
    beforeEach(() => {
        mockPostStatusPresenterView = mock<PostStatusView>();
        const mockPostStatusPresenterViewInstance = instance(mockPostStatusPresenterView);

        const postStatusPresenterSpy = spy(new PostStatusPresenter(mockPostStatusPresenterViewInstance));
        postStatusPresenter = instance(postStatusPresenterSpy);

        mockService = mock<StatusService>()   
        when(postStatusPresenterSpy.service).thenReturn(instance(mockService));
    })

    it(" tells the view to display a posting status message.", async () =>{
        await postStatusPresenter.submitPost(post, mockUser, mockAuthToken)
        verify(mockPostStatusPresenterView.displayInfoMessage("Posting status...", 0)).once();  
    });

    it("calls postStatus on the post status service with the correct status string and auth token.", async() => {
        await postStatusPresenter.submitPost(post, mockUser, mockAuthToken);
        let [capturedAuth, capturedStatus] = capture(mockService.postStatus).last();

        let statusTime : number = capturedStatus.timestamp;
        let status = postStatusPresenter.getStatus(post, mockUser, statusTime);
        
        expect(capturedStatus).toEqual(status);
        expect(capturedAuth).toEqual(mockAuthToken);
        //The authtokens and statuses are valued the exact same.

        verify(mockService.postStatus(mockAuthToken, capturedStatus)).once();
    });

    it ("tells the view to clear the info message that was displayed previously,"
        +  "clear the post, and display a status posted message.", async() => {
        
        await postStatusPresenter.submitPost(post, mockUser, mockAuthToken)
      
        await verify(mockPostStatusPresenterView.setPost("")).once(); //clear
        await verify(mockPostStatusPresenterView.displayInfoMessage("Status posted!", 2000)).once(); //message
        await verify(mockPostStatusPresenterView.deleteMessage(anything())).once();  //delete message
    });
    

    it (" tells the view to clear the info message" 
        + " and display an error message but does not tell it to clear"
        + " the post or display a status posted message", async () => {
        
        let error = new Error("An error occured");
        when(mockService.postStatus(anything(), anything())).thenThrow(error)

        await postStatusPresenter.submitPost(post, mockUser, mockAuthToken)
      
        await verify(mockPostStatusPresenterView.setPost("")).never() //make sure we never cleared
        await verify(mockPostStatusPresenterView.displayInfoMessage("Status Posted!", 2000)).never() //make sure we never sent a message
        await verify(mockPostStatusPresenterView.displayErrorMessage("Failed to post the status because of exception: An error occured")).once(); //
    })

})