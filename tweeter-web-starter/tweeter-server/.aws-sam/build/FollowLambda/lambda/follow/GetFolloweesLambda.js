"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const RequestValidation_1 = require("../validation/RequestValidation");
const FollowService_1 = require("../../model/service/FollowService");
const handler = async (request) => {
    (0, RequestValidation_1.validatePageRequest)(request, "user");
    const followService = new FollowService_1.FollowService();
    const [items, hasMore] = await followService.loadMoreFollowees(request.token, request.userAlias, request.pageSize, request.lastItem);
    return {
        success: true,
        message: null,
        items: items,
        hasMore: hasMore
    };
};
exports.handler = handler;
