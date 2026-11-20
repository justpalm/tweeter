// AI-assisted: see AI-ATTRIBUTION.md
import type { TweeterResponse } from "./TweeterResponse";

export interface GetFolloweeCountResponse extends TweeterResponse {
  readonly count: number;
}
