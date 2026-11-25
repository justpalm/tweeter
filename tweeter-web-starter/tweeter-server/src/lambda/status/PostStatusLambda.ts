// AI-assisted: see AI-ATTRIBUTION.md
import { validatePostStatusRequest } from "../validation/RequestValidation";
import type { PostStatusRequest, PostStatusResponse } from "tweeter-shared";
import { StatusService } from "../../model/service/StatusService";
import { AWSDAOFactory } from "../../model/dao/factory/AWSDAOFactory";

export const handler = async (
  request: PostStatusRequest,
): Promise<PostStatusResponse> => {
  validatePostStatusRequest(request);
  await new StatusService(new AWSDAOFactory()).postStatus(request.token, request.newStatus);
  return { success: true, message: null };
};
