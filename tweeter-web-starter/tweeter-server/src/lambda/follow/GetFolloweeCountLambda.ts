// AI-assisted: see AI-ATTRIBUTION.md
import { requireStrings } from "../validation/RequestValidation";
import type {
  GetFolloweeCountRequest,
  GetFolloweeCountResponse,
} from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";

export const handler = async (
  request: GetFolloweeCountRequest,
): Promise<GetFolloweeCountResponse> => {
  requireStrings(request, ["token", "userAlias"]);
  const followService = new FollowService();
  const count = await followService.getFolloweeCount(
    request.token,
    request.userAlias,
  );

  return { success: true, message: null, count };
};
