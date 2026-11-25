// AI-assisted: see AI-ATTRIBUTION.md
import type { DAOFactory } from "./DAOFactory";
import type { UserDAO } from "../UserDAO";
import { DynamoUserDAO } from "../dynamodb/DynamoUserDAO";
import type { AuthTokenDAO } from "../AuthTokenDAO";
import { DynamoAuthTokenDAO } from "../dynamodb/DynamoAuthTokenDAO";
import type { ImageDAO } from "../ImageDAO";
import { S3ImageDAO } from "../s3/S3ImageDAO";
import type { FollowDAO } from "../FollowDAO";
import { DynamoFollowDAO } from "../dynamodb/DynamoFollowDAO";
import { DynamoStoryDAO } from "../dynamodb/DynamoStoryDAO";
import { DynamoFeedDAO } from "../dynamodb/DynamoFeedDAO";
import type { StoryDAO } from "../StoryDAO";
import type { FeedDAO } from "../FeedDAO";

/** Selects the AWS implementations; services depend only on DAOFactory. */
export class AWSDAOFactory implements DAOFactory {
  private userDAO?: UserDAO;
  private authTokenDAO?: AuthTokenDAO;
  private imageDAO?: ImageDAO;
  private followDAO?: FollowDAO;
  private storyDAO?: StoryDAO;
  private feedDAO?: FeedDAO;

  public constructor(
    private readonly userTableName = process.env.USER_TABLE_NAME,
    private readonly authTokenTableName = process.env.AUTH_TOKEN_TABLE_NAME,
    private readonly imageBucketName = process.env.PROFILE_IMAGE_BUCKET_NAME,
    private readonly region = process.env.AWS_REGION,
    private readonly followTableName = process.env.FOLLOW_TABLE_NAME,
    private readonly followIndexName = process.env.FOLLOW_INDEX_NAME,
    private readonly storyTableName = process.env.STORY_TABLE_NAME,
    private readonly feedTableName = process.env.FEED_TABLE_NAME,
  ) {}

  public getStoryDAO(): StoryDAO {
    if (!this.storyTableName?.trim()) throw new Error("internal-server-error: STORY_TABLE_NAME is required");
    return this.storyDAO ??= new DynamoStoryDAO(this.storyTableName);
  }

  public getFeedDAO(): FeedDAO {
    if (!this.feedTableName?.trim()) throw new Error("internal-server-error: FEED_TABLE_NAME is required");
    return this.feedDAO ??= new DynamoFeedDAO(this.feedTableName);
  }

  public getFollowDAO(): FollowDAO {
    if (!this.followTableName?.trim() || !this.userTableName?.trim() || !this.followIndexName?.trim()) {
      throw new Error("internal-server-error: FOLLOW_TABLE_NAME, USER_TABLE_NAME, and FOLLOW_INDEX_NAME are required");
    }
    this.followDAO ??= new DynamoFollowDAO(this.followTableName, this.userTableName, this.followIndexName);
    return this.followDAO;
  }

  public getImageDAO(): ImageDAO {
    if (!this.imageBucketName?.trim() || !this.region?.trim()) {
      throw new Error("internal-server-error: PROFILE_IMAGE_BUCKET_NAME and AWS_REGION are required");
    }
    this.imageDAO ??= new S3ImageDAO(this.imageBucketName, this.region);
    return this.imageDAO;
  }

  public getAuthTokenDAO(): AuthTokenDAO {
    if (!this.authTokenTableName?.trim()) {
      throw new Error("internal-server-error: AUTH_TOKEN_TABLE_NAME is required");
    }
    this.authTokenDAO ??= new DynamoAuthTokenDAO(this.authTokenTableName);
    return this.authTokenDAO;
  }

  public getUserDAO(): UserDAO {
    if (!this.userTableName?.trim()) {
      throw new Error("internal-server-error: USER_TABLE_NAME is required");
    }
    //the process.env.USER_TABLE_NAME is set in the serverless.yml file, 
    // and is required for the DynamoUserDAO to function properly. 
    // If it is not set, an error is thrown to indicate that the 
    // configuration is incorrect.
    // it makes it so we don't need the table name in the source code.


    this.userDAO ??= new DynamoUserDAO(this.userTableName);
    return this.userDAO;
  }
}
