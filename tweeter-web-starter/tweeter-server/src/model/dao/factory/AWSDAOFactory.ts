// AI-assisted: see AI-ATTRIBUTION.md
import type { DAOFactory } from "./DAOFactory";
import type { UserDAO } from "../UserDAO";
import { DynamoUserDAO } from "../dynamodb/DynamoUserDAO";
import type { AuthTokenDAO } from "../AuthTokenDAO";
import { DynamoAuthTokenDAO } from "../dynamodb/DynamoAuthTokenDAO";

/** Selects the AWS implementations; services depend only on DAOFactory. */
export class AWSDAOFactory implements DAOFactory {
  private userDAO?: UserDAO;
  private authTokenDAO?: AuthTokenDAO;

  public constructor(
    private readonly userTableName = process.env.USER_TABLE_NAME,
    private readonly authTokenTableName = process.env.AUTH_TOKEN_TABLE_NAME,
  ) {}

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
