// AI-assisted: see AI-ATTRIBUTION.md
import type { TweeterRequest } from "./TweeterRequest";

export interface GetFollowerCountRequest extends TweeterRequest {
  readonly token: string;
  readonly userAlias: string;
}
