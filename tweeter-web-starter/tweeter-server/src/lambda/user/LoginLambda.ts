// AI-assisted: see AI-ATTRIBUTION.md
import { requireStrings } from "../validation/RequestValidation";
import type { LoginRequest, LoginResponse } from "tweeter-shared";
import { UserService } from "../../model/service/UserService";
import { AWSDAOFactory } from "../../model/dao/factory/AWSDAOFactory";

export const handler = async (
  request: LoginRequest,
): Promise<LoginResponse> => {
  requireStrings(request, ["alias", "password"]);
  const [user, authToken] = await new UserService(new AWSDAOFactory()).login(
    request.alias,
    request.password,
  );
  return {
    success: true,
    message: null,
    user: user.dto,
    token: authToken.token,
    timestamp: authToken.timestamp,
  };
};
