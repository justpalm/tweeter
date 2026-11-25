// AI-assisted: see AI-ATTRIBUTION.md
import { validatePageRequest } from "../validation/RequestValidation";
import type { PagedStatusItemRequest, PagedStatusItemResponse } from "tweeter-shared";
import { StatusService } from "../../model/service/StatusService";
import { AWSDAOFactory } from "../../model/dao/factory/AWSDAOFactory";

export const handler = async (
  request: PagedStatusItemRequest,
): Promise<PagedStatusItemResponse> => {
  validatePageRequest(request, "status");
  const [items, hasMore] = await new StatusService(new AWSDAOFactory()).loadMoreStoryItems(
    request.token, request.userAlias, request.pageSize, request.lastItem,
  );
  return { success: true, message: null, items, hasMore };
};
