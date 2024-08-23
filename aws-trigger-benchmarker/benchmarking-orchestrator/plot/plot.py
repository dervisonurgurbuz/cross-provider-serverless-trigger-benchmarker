import json
import ndjson
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# Paths to the NDJSON files
logs_file_path = 'logs.ndjson'
request_logs_file_path = 'request_log.ndjson'

# Function to read and parse NDJSON file
def read_ndjson_file(file_path):
    data = []
    with open(file_path, 'r') as f:
        for line in f:
            try:
                data.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON on line: {line}")
                print(e)
    return data

# Read the NDJSON files
logs = read_ndjson_file(logs_file_path)
request_logs = read_ndjson_file(request_logs_file_path)

# Create a map for quick lookup of infraInvokeTime, triggerType, and invocation type by traceId
request_log_map = {}
for log in request_logs:
    trace_id = log.get('TraceId') or log['data'].get('traceIdHttp')
    infra_invoke_time = log['data'].get('infraInvokeTime') or log['data'].get('invokeTime')
    trigger_type = log.get('triggerType')
    invocation_type = log.get('invocation')
    if trace_id and infra_invoke_time:
        request_log_map[trace_id] = (infra_invoke_time, trigger_type, invocation_type)

# Calculate time differences
cold_time_differences = {}
warm_time_differences = {}
cold_trigger_types = {}
warm_trigger_types = {}
seen_trace_ids = set()
for log in logs:
    trace_id = log.get('TraceId') or log.get('queryStringParameters', {}).get('traceId')
    trigger_start_time = log.get('triggerStartTime')
    if trace_id and trigger_start_time and trace_id in request_log_map and trace_id not in seen_trace_ids:
        infra_invoke_time, trigger_type, invocation_type = request_log_map[trace_id]
        if infra_invoke_time and trigger_start_time:
            time_difference = abs(trigger_start_time - infra_invoke_time)
            if invocation_type == 'cold':
                cold_time_differences[trace_id] = time_difference
                cold_trigger_types[trace_id] = trigger_type
            elif invocation_type == 'warm':
                warm_time_differences[trace_id] = time_difference
                warm_trigger_types[trace_id] = trigger_type
            seen_trace_ids.add(trace_id)

# Function to sort trace IDs based on their trigger types
def sort_trace_ids_by_trigger_type(trace_ids, trigger_types):
    return sorted(trace_ids, key=lambda trace_id: trigger_types[trace_id])

# Generate graph
def generate_graph(time_differences, trigger_types, title, filename):
    trace_ids = sort_trace_ids_by_trigger_type(list(time_differences.keys()), trigger_types)
    values = [time_differences[trace_id] for trace_id in trace_ids]
    colors = [trigger_types[trace_id] for trace_id in trace_ids]

    color_map = {
        'storage': 'blue',
        'database': 'green',
        'sns': 'red',
        'http': 'purple'
    }
    bar_colors = [color_map.get(color, 'grey') for color in colors]

    plt.figure(figsize=(10, 6))
    plt.bar(trace_ids, values, color=bar_colors)
    plt.xlabel('Trace ID')
    plt.ylabel('Time Difference (ms)')
    plt.title(title)
    plt.xticks(rotation=90)
    plt.tight_layout()

    # Adding legend
    legend_patches = [mpatches.Patch(color=color, label=label) for label, color in color_map.items()]
    plt.legend(handles=legend_patches, title='Trigger Type')

    plt.savefig(filename)
    # plt.show()

# Generate graphs for cold and warm invocations
generate_graph(cold_time_differences, cold_trigger_types, 'Time Difference (Cold Invocation)', './plots/time_differences_cold.png')
generate_graph(warm_time_differences, warm_trigger_types, 'Time Difference (Warm Invocation)', './plots/time_differences_warm.png')