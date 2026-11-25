"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const RequestValidation_1 = require("../validation/RequestValidation");
const UserService_1 = require("../../model/service/UserService");
const AWSDAOFactory_1 = require("../../model/dao/factory/AWSDAOFactory");
const handler = async (request) => {
    (0, RequestValidation_1.requireStrings)(request, ["token"]);
    await new UserService_1.UserService(new AWSDAOFactory_1.AWSDAOFactory()).logout(request.token);
    return { success: true, message: null };
};
exports.handler = handler;
