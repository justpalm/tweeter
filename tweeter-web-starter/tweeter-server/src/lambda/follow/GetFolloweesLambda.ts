// AI-assisted: see AI-ATTRIBUTION.md
import { validatePageRequest } from "../validation/RequestValidation";
import type {
  PagedUserItemRequest,
  PagedUserItemResponse,
} from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";
import { AWSDAOFactory } from "../../model/dao/factory/AWSDAOFactory";

export const handler = async (request : PagedUserItemRequest) : Promise<PagedUserItemResponse> => {
  validatePageRequest(request, "user");

    const followService = new FollowService(new AWSDAOFactory());
    const [items, hasMore] = await followService.loadMoreFollowees(
      request.token,
      request.userAlias,
      request.pageSize,
      request.lastItem
     );

     return {
        success:true,
        message:null,
        items :items,
        hasMore:hasMore
     }
    

};

