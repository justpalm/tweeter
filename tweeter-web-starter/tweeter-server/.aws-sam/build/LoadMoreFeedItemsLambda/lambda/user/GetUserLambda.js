"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const UserService_1 = require("../../model/service/UserService");
const handler = async (request) => {
    const user = await new UserService_1.UserService().getUser(request.token, request.alias);
    return {
        success: true,
        message: null,
        user: user === null ? null : user.dto,
    };
};
exports.handler = handler;
