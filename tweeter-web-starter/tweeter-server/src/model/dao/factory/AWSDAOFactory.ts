// AI-assisted: see AI-ATTRIBUTION.md
import type { DAOFactory } from "./DAOFactory";
import type { UserDAO } from "../UserDAO";
import { DynamoUserDAO } from "../dynamodb/DynamoUserDAO";
import type { AuthTokenDAO } from "../AuthTokenDAO";
import { DynamoAuthTokenDAO } from "../dynamodb/DynamoAuthTokenDAO";
import type { ImageDAO } from "../ImageDAO";
import { S3ImageDAO } from "../s3/S3ImageDAO";

/** Selects the AWS implementations; services depend only on DAOFactory. */
export class AWSDAOFactory implements DAOFactory {
  private userDAO?: UserDAO;
  private authTokenDAO?: AuthTokenDAO;
  private imageDAO?: ImageDAO;

  public constructor(
    private readonly userTableName = process.env.USER_TABLE_NAME,
    private readonly authTokenTableName = process.env.AUTH_TOKEN_TABLE_NAME,
    private readonly imageBucketName = process.env.PROFILE_IMAGE_BUCKET_NAME,
    private readonly region = process.env.AWS_REGION,
  ) {}

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
