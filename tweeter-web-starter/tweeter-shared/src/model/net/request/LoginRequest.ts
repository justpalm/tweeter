// AI-assisted: see AI-ATTRIBUTION.md
import type { TweeterRequest } from "./TweeterRequest";

export interface LoginRequest extends TweeterRequest {
  readonly alias: string;
  readonly password: string;
}
