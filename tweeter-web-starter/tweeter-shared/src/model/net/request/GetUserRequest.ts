// AI-assisted: see AI-ATTRIBUTION.md
import type { TweeterRequest } from "./TweeterRequest";

export interface GetUserRequest extends TweeterRequest {
  readonly token: string;
  readonly alias: string;
}
