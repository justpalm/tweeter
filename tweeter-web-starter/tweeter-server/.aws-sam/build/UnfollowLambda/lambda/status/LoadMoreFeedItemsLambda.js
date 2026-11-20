"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const StatusService_1 = require("../../model/service/StatusService");
const handler = async (request) => {
    const [items, hasMore] = await new StatusService_1.StatusService().loadMoreFeedItems(request.token, request.userAlias, request.pageSize, request.lastItem);
    return { success: true, message: null, items, hasMore };
};
exports.handler = handler;
