// AI-assisted: see AI-ATTRIBUTION.md
import { Status } from "tweeter-shared";
import { AuthToken } from "tweeter-shared/dist/model/domain/AuthToken";
import { Service } from "./Service";
import { ServerFacade } from "../model/net/ServerFacade";

export class StatusService implements Service {
    private serverFacade = new ServerFacade();

    public async loadMoreStoryItems (
          authToken: AuthToken,
          userAlias: string,
          pageSize: number,
          lastItem: Status | null
        ): Promise<[Status[], boolean]>{
          return this.serverFacade.loadMoreStoryItems({
            token: authToken.token,
            userAlias,
            pageSize,
            lastItem: lastItem === null ? null : lastItem.dto,
          });
        };
    
    public async loadMoreFeedItems (
            authToken: AuthToken,
            userAlias: string,
            pageSize: number,
            lastItem: Status | null
          ): Promise<[Status[], boolean]> {
            return this.serverFacade.loadMoreFeedItems({
              token: authToken.token,
              userAlias,
              pageSize,
              lastItem: lastItem === null ? null : lastItem.dto,
            });
        };


    public postStatus = async (
        authToken: AuthToken,
        newStatus: Status,
      ): Promise<void> => {
        // Pause so we can see the logging out message. Remove when connected to the server
        await new Promise((f) => setTimeout(f, 2000));
        // TODO: Call the server to post the status
      };
    

};
