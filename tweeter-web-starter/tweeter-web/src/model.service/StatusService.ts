import { Status } from "tweeter-shared";
import { AuthToken } from "tweeter-shared/dist/model/domain/AuthToken";
import { FakeData } from "tweeter-shared/dist/util/FakeData";
import { Service } from "./Service";

export class StatusService implements Service {


    public async loadMoreStoryItems (
          authToken: AuthToken,
          userAlias: string,
          pageSize: number,
          lastItem: Status | null
        ): Promise<[Status[], boolean]>{
          // TODO: Replace with the result of calling server
          return FakeData.instance.getPageOfStatuses(lastItem, pageSize);
        };
    
    public async loadMoreFeedItems (
            authToken: AuthToken,
            userAlias: string,
            pageSize: number,
            lastItem: Status | null
          ): Promise<[Status[], boolean]> {
            // TODO: Replace with the result of calling server
            return FakeData.instance.getPageOfStatuses(lastItem, pageSize);
        };





};