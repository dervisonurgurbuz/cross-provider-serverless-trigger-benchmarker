
package com.serverless;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.apache.log4j.Logger;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

public class Handler implements RequestHandler<Map<String, Object>, ApiGatewayResponse> {

    private static final Logger LOG = Logger.getLogger(Handler.class);

    @Override
    public ApiGatewayResponse handleRequest(Map<String, Object> input, Context context) {
        long startTime = System.currentTimeMillis();
        LOG.info("received: " + input);

        // Extract traceId from query string parameters
        String traceId = null;
        if (input.containsKey("queryStringParameters")) {
            Map<String, String> queryStringParameters = (Map<String, String>) input.get("queryStringParameters");
            traceId = queryStringParameters.get("traceId");
        }

        // Get current time in ISO format
        String currentTime = new Date().toString();

        // Prepare response body
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("message", "traceId: " + traceId + ", triggerStartTime: " + startTime + ", runtime: java");
        responseBody.put("traceIdHttp", traceId);
        responseBody.put("currentTime", currentTime);

        // Prepare response headers
        Map<String, String> headers = new HashMap<>();
        headers.put("X-Powered-By", "AWS Lambda & Serverless");
        headers.put("Content-Type", "application/json");

        return ApiGatewayResponse.builder()
                .setStatusCode(200)
                .setObjectBody(responseBody)
                .setHeaders(headers)
                .build();
    }
}
