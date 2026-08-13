import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ENV } from "./env.js";

const client = new DynamoDBClient({
  region: ENV.AWS_REGION,
  ...(ENV.AWS_ACCESS_KEY_ID && ENV.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: ENV.AWS_ACCESS_KEY_ID,
          secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

/**
 * Document client — aceita objetos JS sem AttributeValue manual.
 * Sem Access Key no env, usa a chain padrão da AWS (IAM role, profile, etc.).
 */
export const dynamoDocClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});
