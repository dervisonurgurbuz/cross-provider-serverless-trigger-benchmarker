import json
import ndjson
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

# Line styles and color specifications
line_styles = {
    'http': (0, ()),          
    'queue': (0, (1, 1)),    
    'storage': (0, (5, 5)),  
    'queue': (0, (3, 5, 1, 5, 1, 5)),  
    'database': (0, (3, 5, 1, 5)),
}

colors = {
    'http': '#1B9E77',    
    'queue': '#D95F02',  
    'storage': '#7570B3', 
    'queue': '#09ADBB' ,     
    'database':  '#E7298A',
}

# Default color and linestyle if not specified
default_color = '#666666'  
default_linestyle = (0, (3, 1))  

# Compute ECDF
def compute_ecdf(data):
    """Compute ECDF for a one-dimensional array of measurements."""
    n = len(data)  
    x = np.sort(data)
    y = np.arange(1, n+1) / n
    return x, y



def plot_ecdf_by_trigger_type(time_diffs, trigger_typs, invocation):
    plt.figure(figsize=(10, 6))
    sorted_trigger_types = sorted(set(trigger_typs.values()))   

    for trigger_type in sorted_trigger_types:
       
        filtered_times = [time_diffs[tid] for tid in time_diffs if trigger_typs[tid] == trigger_type]

        if filtered_times:  
            x, y = compute_ecdf(filtered_times)
            median = np.median(filtered_times)
            median = int(median) if median.is_integer() else round(median)
            color = colors.get(trigger_type, default_color)
            linestyle = line_styles.get(trigger_type, default_linestyle)

           
            label_text = f"{trigger_type.upper()} (median: {median} ms)" if 'http' in trigger_type.lower() else f"{trigger_type.capitalize()} (median: {median} ms)"

            # Plotting ECDF line
            plt.plot(x, y, label=label_text,
                     linestyle=linestyle, color=color)

            # Plotting median line
            plt.axvline(x=median, color=color, linestyle='--', linewidth=1)


    min_time = min(time_diffs.values())
    max_time = max(time_diffs.values())
    start_tick = max(0, min_time - (min_time % 500)) if min_time > 500 else 0
    plt.xticks(np.arange(start_tick, max_time + 500, 500))

    
    plt.legend(title='Trigger Type', bbox_to_anchor=(0.5, -0.2), loc='upper center', ncol=2)

    plt.title(f'AWS ECDF of Trigger Latency by Trigger Type ({invocation.capitalize()} Invocation)', fontsize=16)
    plt.xlabel('Trigger Latency (ms)')
    plt.ylabel('Empirical Cumulative Distribution Function (ECDF)')
    plt.grid(True)
    plt.tight_layout(rect=[0, 0, 1, 0.85])  
    plt.savefig(f'./plots/ecdf_{invocation}_invocations_median.pdf')  
    plt.show()
    plt.clf()  

logs_file_path = 'logs.ndjson'
request_logs_file_path = 'request_log.ndjson'


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


logs = read_ndjson_file(logs_file_path)
request_logs = read_ndjson_file(request_logs_file_path)


request_log_map = {}
for log in request_logs:
    trace_id = log.get('TraceId') or log['data'].get('traceIdHttp')
    invoke_time = log['data'].get('infraInvokeTime') or log['data'].get('invokeTime')
    trigger_type = log.get('triggerType')
    if(trigger_type == 'sns'):
        trigger_type = 'queue'
    
    invocation_type = log.get('invocation')
    if trace_id and invoke_time:
        request_log_map[trace_id] = (invoke_time, trigger_type, invocation_type)


time_differences = {'cold': {}, 'warm': {}}
trigger_types = {'cold': {}, 'warm': {}}
seen_trace_ids = set()
for log in logs:
    trace_id = log.get('TraceId') or log.get('queryStringParameters', {}).get('traceId')
    trigger_start_time = log.get('triggerStartTime')
    if trace_id and trigger_start_time and trace_id in request_log_map and trace_id not in seen_trace_ids:
        invoke_time, trigger_type, invocation_type = request_log_map[trace_id]
        if invoke_time and trigger_start_time:
            time_difference = abs(trigger_start_time - invoke_time)
            if invocation_type in ['cold', 'warm']:
                time_differences[invocation_type][trace_id] = time_difference
                trigger_types[invocation_type][trace_id] = trigger_type


for invocation in ['cold', 'warm']:
    plot_ecdf_by_trigger_type(time_differences[invocation], trigger_types[invocation], invocation)
