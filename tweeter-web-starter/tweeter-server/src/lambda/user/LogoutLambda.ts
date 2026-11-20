// AI-assisted: see AI-ATTRIBUTION.md
import { requireStrings } from "../validation/RequestValidation";
import type { LogoutRequest, LogoutResponse } from "tweeter-shared";
import { UserService } from "../../model/service/UserService";

export const handler = async (
  request: LogoutRequest,
): Promise<LogoutResponse> => {
  requireStrings(request, ["token"]);
  await new UserService().logout(request.token);
  return { success: true, message: null };
};
