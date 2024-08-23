import functions_framework
from markupsafe import escape
import time

@functions_framework.http
def hello_http(request):
    request_json = request.get_json(silent=True)
    request_args = request.args

    if request_json and "traceId" in request_json:
        trace_id = request_json["traceId"]
    elif request_args and "traceId" in request_args:
        trace_id = request_args["traceId"]
    else:
        trace_id = "unknown"

    timestamp = round(time.time()*1000)
    return f"traceId: {escape(trace_id)}, triggerStartTime: {timestamp}"


