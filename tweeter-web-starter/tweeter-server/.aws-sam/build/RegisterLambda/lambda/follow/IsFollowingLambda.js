"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const FollowService_1 = require("../../model/service/FollowService");
const handler = async (request) => {
    const followService = new FollowService_1.FollowService();
    const isFollowing = await followService.isFollowing(request.token, request.followerAlias, request.followeeAlias);
    return { success: true, message: null, isFollowing };
};
exports.handler = handler;
