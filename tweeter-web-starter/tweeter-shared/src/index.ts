// AI-assisted: see AI-ATTRIBUTION.md
// All classes that should be avaialble to other modules need to exported here. export * does not work when
// uploading to lambda. Instead we have to list each export.

//
// Domain classes
//
export { Follow } from "./model/domain/Follow";
export { PostSegment, Type } from "./model/domain/PostSegment";
export { Status } from "./model/domain/Status";
export { User } from "./model/domain/User";
export { AuthToken } from "./model/domain/AuthToken";

//
// DTO's
//
export type { UserDto } from "./model/dto/UserDto";
export type { StatusDto } from "./model/dto/StatusDto";

//
// Requests
//
export type { PostStatusRequest } from "./model/net/request/PostStatusRequest";
export type { PagedStatusItemRequest } from "./model/net/request/PagedStatusItemRequest";
export type { PagedUserItemRequest } from "./model/net/request/PagedUserItemRequest";
export type { GetFollowerCountRequest } from "./model/net/request/GetFollowerCountRequest";
export type { GetFolloweeCountRequest } from "./model/net/request/GetFolloweeCountRequest";
export type { TweeterRequest } from "./model/net/request/TweeterRequest";
export type { IsFollowingRequest } from "./model/net/request/IsFollowingRequest";
export type { FollowRequest } from "./model/net/request/FollowRequest";
export type { UnfollowRequest } from "./model/net/request/UnfollowRequest";
export type { RegisterRequest } from "./model/net/request/RegisterRequest";
export type { LoginRequest } from "./model/net/request/LoginRequest";
export type { LogoutRequest } from "./model/net/request/LogoutRequest";
export type { GetUserRequest } from "./model/net/request/GetUserRequest";

//
// Responses
//
export type { PostStatusResponse } from "./model/net/response/PostStatusResponse";
export type { PagedStatusItemResponse } from "./model/net/response/PagedStatusItemResponse";
export type { PagedUserItemResponse } from "./model/net/response/PagedUserItemResponse";
export type { GetFollowerCountResponse } from "./model/net/response/GetFollowerCountResponse";
export type { GetFolloweeCountResponse } from "./model/net/response/GetFolloweeCountResponse";
export type { TweeterResponse } from "./model/net/response/TweeterResponse";
export type { IsFollowingResponse } from "./model/net/response/IsFollowingResponse";
export type { FollowResponse } from "./model/net/response/FollowResponse";
export type { UnfollowResponse } from "./model/net/response/UnfollowResponse";
export type { RegisterResponse } from "./model/net/response/RegisterResponse";
export type { LoginResponse } from "./model/net/response/LoginResponse";
export type { LogoutResponse } from "./model/net/response/LogoutResponse";
export type { GetUserResponse } from "./model/net/response/GetUserResponse";

//
// Other
//
export { FakeData } from "./util/FakeData";
