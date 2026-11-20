// AI-assisted: see AI-ATTRIBUTION.md
import type { TweeterRequest } from "./TweeterRequest";

export interface UnfollowRequest extends TweeterRequest {
  readonly token: string;
  readonly userAlias: string;
}
