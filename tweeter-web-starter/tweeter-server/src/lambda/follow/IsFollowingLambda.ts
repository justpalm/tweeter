// AI-assisted: see AI-ATTRIBUTION.md
import { requireStrings } from "../validation/RequestValidation";
import type { IsFollowingRequest, IsFollowingResponse } from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";

export const handler = async (
  request: IsFollowingRequest,
): Promise<IsFollowingResponse> => {
  requireStrings(request, ["token", "followerAlias", "followeeAlias"]);
  const followService = new FollowService();
  const isFollowing = await followService.isFollowing(
    request.token,
    request.followerAlias,
    request.followeeAlias,
  );

  return { success: true, message: null, isFollowing };
};
