"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AWSDAOFactory = void 0;
const DynamoUserDAO_1 = require("../dynamodb/DynamoUserDAO");
const DynamoAuthTokenDAO_1 = require("../dynamodb/DynamoAuthTokenDAO");
const S3ImageDAO_1 = require("../s3/S3ImageDAO");
const DynamoFollowDAO_1 = require("../dynamodb/DynamoFollowDAO");
const DynamoStoryDAO_1 = require("../dynamodb/DynamoStoryDAO");
const DynamoFeedDAO_1 = require("../dynamodb/DynamoFeedDAO");
/** Selects the AWS implementations; services depend only on DAOFactory. */
class AWSDAOFactory {
    userTableName;
    authTokenTableName;
    imageBucketName;
    region;
    followTableName;
    followIndexName;
    storyTableName;
    feedTableName;
    userDAO;
    authTokenDAO;
    imageDAO;
    followDAO;
    storyDAO;
    feedDAO;
    constructor(userTableName = process.env.USER_TABLE_NAME, authTokenTableName = process.env.AUTH_TOKEN_TABLE_NAME, imageBucketName = process.env.PROFILE_IMAGE_BUCKET_NAME, region = process.env.AWS_REGION, followTableName = process.env.FOLLOW_TABLE_NAME, followIndexName = process.env.FOLLOW_INDEX_NAME, storyTableName = process.env.STORY_TABLE_NAME, feedTableName = process.env.FEED_TABLE_NAME) {
        this.userTableName = userTableName;
        this.authTokenTableName = authTokenTableName;
        this.imageBucketName = imageBucketName;
        this.region = region;
        this.followTableName = followTableName;
        this.followIndexName = followIndexName;
        this.storyTableName = storyTableName;
        this.feedTableName = feedTableName;
    }
    getStoryDAO() {
        if (!this.storyTableName?.trim())
            throw new Error("internal-server-error: STORY_TABLE_NAME is required");
        return this.storyDAO ??= new DynamoStoryDAO_1.DynamoStoryDAO(this.storyTableName);
    }
    getFeedDAO() {
        if (!this.feedTableName?.trim())
            throw new Error("internal-server-error: FEED_TABLE_NAME is required");
        return this.feedDAO ??= new DynamoFeedDAO_1.DynamoFeedDAO(this.feedTableName);
    }
    getFollowDAO() {
        if (!this.followTableName?.trim() || !this.userTableName?.trim() || !this.followIndexName?.trim()) {
            throw new Error("internal-server-error: FOLLOW_TABLE_NAME, USER_TABLE_NAME, and FOLLOW_INDEX_NAME are required");
        }
        this.followDAO ??= new DynamoFollowDAO_1.DynamoFollowDAO(this.followTableName, this.userTableName, this.followIndexName);
        return this.followDAO;
    }
    getImageDAO() {
        if (!this.imageBucketName?.trim() || !this.region?.trim()) {
            throw new Error("internal-server-error: PROFILE_IMAGE_BUCKET_NAME and AWS_REGION are required");
        }
        this.imageDAO ??= new S3ImageDAO_1.S3ImageDAO(this.imageBucketName, this.region);
        return this.imageDAO;
    }
    getAuthTokenDAO() {
        if (!this.authTokenTableName?.trim()) {
            throw new Error("internal-server-error: AUTH_TOKEN_TABLE_NAME is required");
        }
        this.authTokenDAO ??= new DynamoAuthTokenDAO_1.DynamoAuthTokenDAO(this.authTokenTableName);
        return this.authTokenDAO;
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
