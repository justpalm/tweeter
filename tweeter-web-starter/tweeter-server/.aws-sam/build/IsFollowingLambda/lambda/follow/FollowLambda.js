"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const RequestValidation_1 = require("../validation/RequestValidation");
const FollowService_1 = require("../../model/service/FollowService");
const AWSDAOFactory_1 = require("../../model/dao/factory/AWSDAOFactory");
const handler = async (request) => {
    (0, RequestValidation_1.requireStrings)(request, ["token", "userAlias"]);
    const followService = new FollowService_1.FollowService(new AWSDAOFactory_1.AWSDAOFactory());
    const [followerCount, followeeCount] = await followService.follow(request.token, request.userAlias);
    return { success: true, message: null, followerCount, followeeCount };
};
exports.handler = handler;
