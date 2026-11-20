"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const RequestValidation_1 = require("../validation/RequestValidation");
const UserService_1 = require("../../model/service/UserService");
const handler = async (request) => {
    (0, RequestValidation_1.requireStrings)(request, ["token"]);
    await new UserService_1.UserService().logout(request.token);
    return { success: true, message: null };
};
exports.handler = handler;
