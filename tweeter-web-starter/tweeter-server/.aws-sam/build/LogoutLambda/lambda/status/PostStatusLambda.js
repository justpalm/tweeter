"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const RequestValidation_1 = require("../validation/RequestValidation");
const StatusService_1 = require("../../model/service/StatusService");
const AWSDAOFactory_1 = require("../../model/dao/factory/AWSDAOFactory");
const handler = async (request) => {
    (0, RequestValidation_1.validatePostStatusRequest)(request);
    await new StatusService_1.StatusService(new AWSDAOFactory_1.AWSDAOFactory()).postStatus(request.token, request.newStatus);
    return { success: true, message: null };
};
exports.handler = handler;
