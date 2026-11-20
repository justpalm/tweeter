// AI-assisted: see AI-ATTRIBUTION.md
import { requireStrings } from "../validation/RequestValidation";
import type { GetUserRequest, GetUserResponse } from "tweeter-shared";
import { UserService } from "../../model/service/UserService";

export const handler = async (
  request: GetUserRequest,
): Promise<GetUserResponse> => {
  requireStrings(request, ["token", "alias"]);
  const user = await new UserService().getUser(request.token, request.alias);
  return {
    success: true,
    message: null,
    user: user === null ? null : user.dto,
  };
};
