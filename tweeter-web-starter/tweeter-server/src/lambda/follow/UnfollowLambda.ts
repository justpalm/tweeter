// AI-assisted: see AI-ATTRIBUTION.md
import { requireStrings } from "../validation/RequestValidation";
import type { UnfollowRequest, UnfollowResponse } from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";
import { AWSDAOFactory } from "../../model/dao/factory/AWSDAOFactory";

export const handler = async (
  request: UnfollowRequest,
): Promise<UnfollowResponse> => {
  requireStrings(request, ["token", "userAlias"]);
  const followService = new FollowService(new AWSDAOFactory());
  const [followerCount, followeeCount] = await followService.unfollow(
    request.token,
    request.userAlias,
  );

  return { success: true, message: null, followerCount, followeeCount };
};
