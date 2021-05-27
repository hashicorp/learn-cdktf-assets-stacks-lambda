import { APIGatewayProxyResult } from "aws-lambda";

export const handler = async (): Promise<APIGatewayProxyResult> => {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
        },
        body: `<p>Hello world!</p>`,
    }
}
