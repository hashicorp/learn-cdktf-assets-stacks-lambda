import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const queries = event.queryStringParameters;
    let name = 'there';

    if (queries !== null && queries !== undefined) {
        if (queries["name"]) {
            name = queries["name"];
        }
    }

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
        },
        body: `<p>Hello ${name}!</p>`,
    }
}
