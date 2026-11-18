// AI-assisted: see AI-ATTRIBUTION.md
import { User } from "tweeter-shared";
import type {
  GetFolloweeCountRequest,
  GetFolloweeCountResponse,
  GetFollowerCountRequest,
  GetFollowerCountResponse,
  PagedUserItemRequest,
  PagedUserItemResponse,
} from "tweeter-shared";
import { ClientCommunicator } from "./ClientCommunicator";

export class ServerFacade {
  private SERVER_URL =
    "https://we8tshfgt5.execute-api.us-east-2.amazonaws.com/prod";

  private clientCommunicator = new ClientCommunicator(this.SERVER_URL);

  public async getFolloweeCount(
    request: GetFolloweeCountRequest,
  ): Promise<number> {
    const response = await this.clientCommunicator.doPost<
      GetFolloweeCountRequest,
      GetFolloweeCountResponse
    >(request, "/lambda/followees/count");

    if (!response.success) {
      throw new Error(response.message ?? "Failed to get followee count");
    }

    if (!Number.isInteger(response.count) || response.count < 0) {
      throw new Error("Invalid followee count returned by server");
    }

    return response.count;
  }

  public async getFollowerCount(
    request: GetFollowerCountRequest,
  ): Promise<number> {
    const response = await this.clientCommunicator.doPost<
      GetFollowerCountRequest,
      GetFollowerCountResponse
    >(request, "/lambda/followers/count");

    if (!response.success) {
      throw new Error(response.message ?? "Failed to get follower count");
    }

    if (!Number.isInteger(response.count) || response.count < 0) {
      throw new Error("Invalid follower count returned by server");
    }

    return response.count;
  }

  public async getMoreFollowers(
    request: PagedUserItemRequest,
  ): Promise<[User[], boolean]> {
    const response = await this.clientCommunicator.doPost<
      PagedUserItemRequest,
      PagedUserItemResponse
    >(request, "/lambda/followers/list");

    const items: User[] | null =
      response.success && response.items
        ? response.items.map((dto) => User.fromDto(dto) as User)
        : null;

    if (response.success) {
      if (items == null) {
        throw new Error("No followers found");
      } else {
        return [items, response.hasMore];
      }
    } else {
      console.error(response);
      throw new Error(response.message ?? undefined);
    }
  }

  public async getMoreFollowees(
    request: PagedUserItemRequest,
  ): Promise<[User[], boolean]> {
    const response = await this.clientCommunicator.doPost<
      PagedUserItemRequest,
      PagedUserItemResponse
    >(request, "/lambda/followees/list");

    const items: User[] | null =
      response.success && response.items
        ? response.items.map((dto) => User.fromDto(dto) as User)
        : null;

    if (response.success) {
      if (items == null) {
        throw new Error("No followees found");
      } else {
        return [items, response.hasMore];
      }
    } else {
      console.error(response);
      throw new Error(response.message ?? undefined);
    }
  }
}
