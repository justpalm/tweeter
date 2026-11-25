"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AWSDAOFactory = void 0;
const DynamoUserDAO_1 = require("../dynamodb/DynamoUserDAO");
/** Selects the AWS implementations; services depend only on DAOFactory. */
class AWSDAOFactory {
    userTableName;
    userDAO;
    constructor(userTableName = process.env.USER_TABLE_NAME) {
        this.userTableName = userTableName;
    }
    getUserDAO() {
        if (!this.userTableName?.trim()) {
            throw new Error("internal-server-error: USER_TABLE_NAME is required");
        }
        //the process.env.USER_TABLE_NAME is set in the serverless.yml file, 
        // and is required for the DynamoUserDAO to function properly. 
        // If it is not set, an error is thrown to indicate that the 
        // configuration is incorrect.
        // it makes it so we don't need the table name in the source code.
        this.userDAO ??= new DynamoUserDAO_1.DynamoUserDAO(this.userTableName);
        return this.userDAO;
    }
}
exports.AWSDAOFactory = AWSDAOFactory;
