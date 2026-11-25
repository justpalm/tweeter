// AI-assisted: see AI-ATTRIBUTION.md
import { requireStrings } from "../validation/RequestValidation";
import type { GetUserRequest, GetUserResponse } from "tweeter-shared";
import { UserService } from "../../model/service/UserService";
import { AWSDAOFactory } from "../../model/dao/factory/AWSDAOFactory";

export const handler = async (
  request: GetUserRequest,
): Promise<GetUserResponse> => {
  requireStrings(request, ["token", "alias"]);
  const user = await new UserService(new AWSDAOFactory()).getUser(request.token, request.alias);
  return {
    success: true,
    message: null,
    user: user === null ? null : user.dto,
  };
};
