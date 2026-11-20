// AI-assisted: see AI-ATTRIBUTION.md
import type { UserDto } from "../../dto/UserDto";
import type { TweeterResponse } from "./TweeterResponse";

export interface LoginResponse extends TweeterResponse {
  readonly user: UserDto | null;
  readonly token: string | null;
  readonly timestamp: number | null;
}
