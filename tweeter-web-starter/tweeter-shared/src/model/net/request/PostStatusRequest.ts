// AI-assisted: see AI-ATTRIBUTION.md
import type { StatusDto } from "../../dto/StatusDto";
import type { TweeterRequest } from "./TweeterRequest";

export interface PostStatusRequest extends TweeterRequest {
  readonly token: string;
  readonly newStatus: StatusDto;
}
