// AI-assisted: see AI-ATTRIBUTION.md
import type { UserDto } from "../../dto/UserDto";
import type { TweeterRequest } from "./TweeterRequest";

export interface PagedUserItemRequest extends TweeterRequest {
  readonly token: string;
  readonly userAlias: string;
  readonly pageSize: number;
  readonly lastItem: UserDto | null;
}
