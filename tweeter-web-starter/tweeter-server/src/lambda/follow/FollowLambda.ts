// AI-assisted: see AI-ATTRIBUTION.md
import { requireStrings } from "../validation/RequestValidation";
import type { FollowRequest, FollowResponse } from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";
import { AWSDAOFactory } from "../../model/dao/factory/AWSDAOFactory";

export const handler = async (
  request: FollowRequest,
): Promise<FollowResponse> => {
  requireStrings(request, ["token", "userAlias"]);
  const followService = new FollowService(new AWSDAOFactory());
  const [followerCount, followeeCount] = await followService.follow(
    request.token,
    request.userAlias,
  );

  return { success: true, message: null, followerCount, followeeCount };
};
