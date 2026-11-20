"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const StatusService_1 = require("../../model/service/StatusService");
const handler = async (request) => {
    await new StatusService_1.StatusService().postStatus(request.token, request.newStatus);
    return { success: true, message: null };
};
exports.handler = handler;
