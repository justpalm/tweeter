// AI-assisted: see AI-ATTRIBUTION.md
import { validatePageRequest } from "../validation/RequestValidation";
import type {
  PagedUserItemRequest,
  PagedUserItemResponse,
} from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";

export const handler = async (
  request: PagedUserItemRequest,
): Promise<PagedUserItemResponse> => {
  validatePageRequest(request, "user");
  const followService = new FollowService();
  const [items, hasMore] = await followService.loadMoreFollowers(
    request.token,
    request.userAlias,
    request.pageSize,
    request.lastItem,
  );

  return { success: true, message: null, items, hasMore };
};
