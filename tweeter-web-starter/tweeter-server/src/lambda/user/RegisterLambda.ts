// AI-assisted: see AI-ATTRIBUTION.md
import { requireStrings } from "../validation/RequestValidation";
import type { RegisterRequest, RegisterResponse } from "tweeter-shared";
import { UserService } from "../../model/service/UserService";

export const handler = async (
  request: RegisterRequest,
): Promise<RegisterResponse> => {
  requireStrings(request, ["firstName", "lastName", "alias", "password", "imageStringBase64", "imageFileExtension"]);
  const [user, authToken] = await new UserService().register(
    request.firstName,
    request.lastName,
    request.alias,
    request.password,
    request.imageStringBase64,
    request.imageFileExtension,
  );
  return {
    success: true,
    message: null,
    user: user.dto,
    token: authToken.token,
    timestamp: authToken.timestamp,
  };
};
