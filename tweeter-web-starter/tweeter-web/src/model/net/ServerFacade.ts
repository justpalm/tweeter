// AI-assisted: see AI-ATTRIBUTION.md
import { AuthToken, Status, User } from "tweeter-shared";
import type {
  PagedStatusItemRequest,
  PagedStatusItemResponse,
  GetUserRequest,
  GetUserResponse,
  LogoutRequest,
  LogoutResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  FollowRequest,
  FollowResponse,
  UnfollowRequest,
  UnfollowResponse,
  IsFollowingRequest,
  IsFollowingResponse,
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

  public async loadMoreFeedItems(
    request: PagedStatusItemRequest,
  ): Promise<[Status[], boolean]> {
    const response = await this.clientCommunicator.doPost<
      PagedStatusItemRequest,
      PagedStatusItemResponse
    >(request, "/lambda/feed/list");

    if (!response.success) {
      throw new Error(response.message ?? "Failed to load feed items");
    }
    if (!Array.isArray(response.items) || typeof response.hasMore !== "boolean") {
      throw new Error("Invalid feed data returned by server");
    }

    const items = response.items.map(dto => {
      if (
        dto == null || typeof dto.post !== "string" ||
        typeof dto.timestamp !== "number" ||
        !Number.isFinite(dto.timestamp) || dto.timestamp < 0 ||
        dto.user == null ||
        typeof dto.user.firstName !== "string" ||
        typeof dto.user.lastName !== "string" ||
        typeof dto.user.alias !== "string" || dto.user.alias.length === 0 ||
        typeof dto.user.imageUrl !== "string"
      ) {
        throw new Error("Invalid feed data returned by server");
      }
      return Status.fromDto(dto) as Status;
    });
    return [items, response.hasMore];
  }

  public async loadMoreStoryItems(
    request: PagedStatusItemRequest,
  ): Promise<[Status[], boolean]> {
    const response = await this.clientCommunicator.doPost<
      PagedStatusItemRequest,
      PagedStatusItemResponse
    >(request, "/lambda/story/list");

    if (!response.success) {
      throw new Error(response.message ?? "Failed to load story items");
    }
    if (!Array.isArray(response.items) || typeof response.hasMore !== "boolean") {
      throw new Error("Invalid story data returned by server");
    }

    const items = response.items.map(dto => {
      if (
        dto == null || typeof dto.post !== "string" ||
        typeof dto.timestamp !== "number" ||
        !Number.isFinite(dto.timestamp) || dto.timestamp < 0 ||
        dto.user == null ||
        typeof dto.user.firstName !== "string" ||
        typeof dto.user.lastName !== "string" ||
        typeof dto.user.alias !== "string" || dto.user.alias.length === 0 ||
        typeof dto.user.imageUrl !== "string"
      ) {
        throw new Error("Invalid story data returned by server");
      }
      return Status.fromDto(dto) as Status;
    });
    return [items, response.hasMore];
  }

  public async getUser(request: GetUserRequest): Promise<User | null> {
    const response = await this.clientCommunicator.doPost<GetUserRequest, GetUserResponse>(
      request, "/lambda/user/get",
    );
    if (!response.success) {
      throw new Error(response.message ?? "Failed to get user");
    }

    const user = response.user;
    if (user === null) {
      return null;
    }
    if (
      user == null ||
      typeof user.firstName !== "string" ||
      typeof user.lastName !== "string" ||
      typeof user.alias !== "string" || user.alias.length === 0 ||
      typeof user.imageUrl !== "string"
    ) {
      throw new Error("Invalid user data returned by server");
    }
    return User.fromDto(user);
  }

  public async logout(request: LogoutRequest): Promise<void> {
    const response = await this.clientCommunicator.doPost<LogoutRequest, LogoutResponse>(
      request, "/lambda/logout",
    );
    if (!response.success) {
      throw new Error(response.message ?? "Failed to log out user");
    }
  }

  public async login(request: LoginRequest): Promise<[User, AuthToken]> {
    const response = await this.clientCommunicator.doPost<LoginRequest, LoginResponse>(
      request, "/lambda/login",
    );
    if (!response.success) {
      throw new Error(response.message ?? "Failed to log in user");
    }

    const user = response.user;
    if (
      user == null ||
      typeof user.firstName !== "string" ||
      typeof user.lastName !== "string" ||
      typeof user.alias !== "string" || user.alias.length === 0 ||
      typeof user.imageUrl !== "string" ||
      typeof response.token !== "string" || response.token.length === 0 ||
      typeof response.timestamp !== "number" ||
      !Number.isFinite(response.timestamp) || response.timestamp < 0
    ) {
      throw new Error("Invalid login data returned by server");
    }
    return [User.fromDto(user) as User, new AuthToken(response.token, response.timestamp)];
  }

  public async register(request: RegisterRequest): Promise<[User, AuthToken]> {
    const response = await this.clientCommunicator.doPost<
      RegisterRequest,
      RegisterResponse
    >(request, "/lambda/register");

    if (!response.success) {
      throw new Error(response.message ?? "Failed to register user");
    }

    const user = response.user;
    if (
      user == null ||
      typeof user.firstName !== "string" ||
      typeof user.lastName !== "string" ||
      typeof user.alias !== "string" || user.alias.length === 0 ||
      typeof user.imageUrl !== "string" ||
      typeof response.token !== "string" || response.token.length === 0 ||
      typeof response.timestamp !== "number" ||
      !Number.isFinite(response.timestamp) || response.timestamp < 0
    ) {
      throw new Error("Invalid registration data returned by server");
    }

    return [User.fromDto(user) as User, new AuthToken(response.token, response.timestamp)];
  }

  public async follow(
    request: FollowRequest,
  ): Promise<[followerCount: number, followeeCount: number]> {
    const response = await this.clientCommunicator.doPost<
      FollowRequest,
      FollowResponse
    >(request, "/lambda/follow");

    if (!response.success) {
      throw new Error(response.message ?? "Failed to follow user");
    }

    if (
      !Number.isInteger(response.followerCount) || response.followerCount < 0 ||
      !Number.isInteger(response.followeeCount) || response.followeeCount < 0
    ) {
      throw new Error("Invalid follow counts returned by server");
    }

    return [response.followerCount, response.followeeCount];
  }

  public async unfollow(
    request: UnfollowRequest,
  ): Promise<[followerCount: number, followeeCount: number]> {
    const response = await this.clientCommunicator.doPost<
      UnfollowRequest,
      UnfollowResponse
    >(request, "/lambda/unfollow");

    if (!response.success) {
      throw new Error(response.message ?? "Failed to unfollow user");
    }

    if (
      !Number.isInteger(response.followerCount) || response.followerCount < 0 ||
      !Number.isInteger(response.followeeCount) || response.followeeCount < 0
    ) {
      throw new Error("Invalid unfollow counts returned by server");
    }

    return [response.followerCount, response.followeeCount];
  }

  public async isFollowing(request: IsFollowingRequest): Promise<boolean> {
    const response = await this.clientCommunicator.doPost<
      IsFollowingRequest,
      IsFollowingResponse
    >(request, "/lambda/follow/is-following");

    if (!response.success) {
      throw new Error(response.message ?? "Failed to determine following status");
    }

    if (typeof response.isFollowing !== "boolean") {
      throw new Error("Invalid following status returned by server");
    }

    return response.isFollowing;
  }

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
