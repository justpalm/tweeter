// AI-assisted: see AI-ATTRIBUTION.md
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Shared by the DAOs in each Lambda execution environment and reused across warm invocations.
export const dynamoDocumentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
