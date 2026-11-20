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
        await this.serverFacade.postStatus({
          token: authToken.token,
          newStatus: newStatus.dto,
        });
      };
    

};
