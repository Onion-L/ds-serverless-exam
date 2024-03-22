import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv({ coerceTypes: true });
const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    // Print Event
    console.log("Event: ", JSON.stringify(event));
    const parameters = event?.pathParameters;
    const movieId = parameters?.movieId
      ? parseInt(parameters.movieId)
      : undefined;  
    const awardBody = parameters?.awardBody;

    const queryStringParameters = event?.queryStringParameters;
    const min = queryStringParameters?.min ? parseInt(queryStringParameters.min) : undefined;

      
    if (!movieId) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movie Id" }),
      };
    }

    if (!awardBody) {
        return {
          statusCode: 404,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ Message: "Missing award body" }),
        };
      }

    const getCommandOutput = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { movieId: movieId },
      })
    );
    if (!getCommandOutput.Item) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Invalid movie Id or award body" }),
      };
    }
    let awards = getCommandOutput.Item;

    let body = {
      data: awards,
    };
    if(awardBody) {
        let result: any = [];
        for (let i = 0; i < awards.length; i++) {
            if(awards[i].awardBody === awardBody) {
                result.push(awards[i])
            }
        }
        body.data = result;
    }
 
    if(min) {
        if(body.data.length < min) {
            return {
                statusCode: 404,
                headers: {
                  "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "Request failed" }),
              };
        }
    }

    // Return Response
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    };
  }
 catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
