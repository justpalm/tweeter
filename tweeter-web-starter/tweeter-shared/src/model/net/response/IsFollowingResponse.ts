// AI-assisted: see AI-ATTRIBUTION.md
import type { TweeterResponse } from "./TweeterResponse";

export interface IsFollowingResponse extends TweeterResponse {
  readonly isFollowing: boolean;
}
