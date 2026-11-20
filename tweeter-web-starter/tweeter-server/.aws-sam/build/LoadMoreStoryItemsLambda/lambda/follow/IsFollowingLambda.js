"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const RequestValidation_1 = require("../validation/RequestValidation");
const FollowService_1 = require("../../model/service/FollowService");
const handler = async (request) => {
    (0, RequestValidation_1.requireStrings)(request, ["token", "followerAlias", "followeeAlias"]);
    const followService = new FollowService_1.FollowService();
    const isFollowing = await followService.isFollowing(request.token, request.followerAlias, request.followeeAlias);
    return { success: true, message: null, isFollowing };
};
exports.handler = handler;
