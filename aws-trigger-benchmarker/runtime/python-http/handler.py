import json
import time

def hello(event, context):

    start_time = int(time.time() * 1000)
    print(event)

    trace_id = event.get('queryStringParameters', {}).get('traceId')


    body = {
        "message": f"traceId: {trace_id}, triggerStartTime: {start_time}, runtime: python",
        "traceIdHttp": trace_id,

    }

    return {"statusCode": 200, "body": json.dumps(body)}

 