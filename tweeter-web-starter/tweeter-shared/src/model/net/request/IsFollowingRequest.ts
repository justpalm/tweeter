// AI-assisted: see AI-ATTRIBUTION.md
import type { TweeterRequest } from "./TweeterRequest";

export interface IsFollowingRequest extends TweeterRequest {
  readonly token: string;
  readonly followerAlias: string;
  readonly followeeAlias: string;
}
