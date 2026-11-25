// AI-assisted: see AI-ATTRIBUTION.md
import { requireStrings } from "../validation/RequestValidation";
import type {
  GetFollowerCountRequest,
  GetFollowerCountResponse,
} from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";
import { AWSDAOFactory } from "../../model/dao/factory/AWSDAOFactory";

export const handler = async (
  request: GetFollowerCountRequest,
): Promise<GetFollowerCountResponse> => {
  requireStrings(request, ["token", "userAlias"]);
  const followService = new FollowService(new AWSDAOFactory());
  const count = await followService.getFollowerCount(
    request.token,
    request.userAlias,
  );

  return { success: true, message: null, count };
};
