// AI-assisted: see AI-ATTRIBUTION.md
import type { TweeterResponse } from "./TweeterResponse";

export interface GetFollowerCountResponse extends TweeterResponse {
  readonly count: number;
}
