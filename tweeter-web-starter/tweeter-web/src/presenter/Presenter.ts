export interface View{ 
    displayErrorMessage: (message: string) => void;
}  

export interface MessageView extends View {
    displayInfoMessage : (message: string, duration: number) => string;
    deleteMessage : (messageId: string) => void;
    setIsLoading: (isLoading: boolean) => void;
}

export abstract class Presenter<V extends View>{
    private _view : V;
 
    protected constructor(view : V) {
        this._view = view;
    }

    public get view() {
        return this._view;
    }

    protected async doFailureReportingOperation(operation : () => Promise<void>, opertaionDescription : string, finally_operation?: () => Promise<void>) {
      try {
        await operation();
      } catch (error) {
        this._view.displayErrorMessage(
          `Failed to ${opertaionDescription} because of exception: ${error}`,
        ); 
      } finally {
        if (!!finally_operation) {
          finally_operation();
        }
      }
    }
 }; 
    
    
    

    




