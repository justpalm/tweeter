// AI-assisted: see AI-ATTRIBUTION.md
import { requireStrings } from "../validation/RequestValidation";
import type {
  GetFollowerCountRequest,
  GetFollowerCountResponse,
} from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";

export const handler = async (
  request: GetFollowerCountRequest,
): Promise<GetFollowerCountResponse> => {
  requireStrings(request, ["token", "userAlias"]);
  const followService = new FollowService();
  const count = await followService.getFollowerCount(
    request.token,
    request.userAlias,
  );

  return { success: true, message: null, count };
};
