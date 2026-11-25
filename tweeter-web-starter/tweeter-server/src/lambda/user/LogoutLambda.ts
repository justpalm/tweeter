// AI-assisted: see AI-ATTRIBUTION.md
import { requireStrings } from "../validation/RequestValidation";
import type { LogoutRequest, LogoutResponse } from "tweeter-shared";
import { UserService } from "../../model/service/UserService";
import { AWSDAOFactory } from "../../model/dao/factory/AWSDAOFactory";

export const handler = async (
  request: LogoutRequest,
): Promise<LogoutResponse> => {
  requireStrings(request, ["token"]);
  await new UserService(new AWSDAOFactory()).logout(request.token);
  return { success: true, message: null };
};
