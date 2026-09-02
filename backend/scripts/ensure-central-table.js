import { CreateTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ENV } from "../src/config/env.js";

const table = ENV.DYNAMODB_CENTRAL_TABLE || "portal_central_comercial";

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

const command = new CreateTableCommand({
  TableName: table,
  AttributeDefinitions: [
    { AttributeName: "pk", AttributeType: "S" },
    { AttributeName: "sk", AttributeType: "S" },
  ],
  KeySchema: [
    { AttributeName: "pk", KeyType: "HASH" },
    { AttributeName: "sk", KeyType: "RANGE" },
  ],
  BillingMode: "PAY_PER_REQUEST",
});

try {
  await client.send(command);
  console.log(`Tabela criada: ${table}`);
} catch (error) {
  if (error.name === "ResourceInUseException") {
    console.log(`Tabela já existe: ${table}`);
  } else {
    console.error(error);
    process.exit(1);
  }
}
