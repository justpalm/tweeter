// AI-assisted: see AI-ATTRIBUTION.md
import type { UserDto } from "../../dto/UserDto";
import type { TweeterResponse } from "./TweeterResponse";

export interface GetUserResponse extends TweeterResponse {
  readonly user: UserDto | null;
}
