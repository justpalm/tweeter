"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const RequestValidation_1 = require("../validation/RequestValidation");
const UserService_1 = require("../../model/service/UserService");
const AWSDAOFactory_1 = require("../../model/dao/factory/AWSDAOFactory");
const handler = async (request) => {
    (0, RequestValidation_1.requireStrings)(request, ["alias", "password"]);
    const [user, authToken] = await new UserService_1.UserService(new AWSDAOFactory_1.AWSDAOFactory()).login(request.alias, request.password);
    return {
        success: true,
        message: null,
        user: user.dto,
        token: authToken.token,
        timestamp: authToken.timestamp,
    };
};
exports.handler = handler;
