// AI-assisted: see AI-ATTRIBUTION.md
import type { StatusDto } from "../../dto/StatusDto";
import type { TweeterRequest } from "./TweeterRequest";

export interface PagedStatusItemRequest extends TweeterRequest {
  readonly token: string;
  readonly userAlias: string;
  readonly pageSize: number;
  readonly lastItem: StatusDto | null;
}
