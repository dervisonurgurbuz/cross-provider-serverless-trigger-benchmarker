import json
import matplotlib.pyplot as plt
from collections import defaultdict
import ndjson
import pandas as pd

def process_ndjson(file_path):
    # Read NDJSON file
    with open(file_path, 'r') as f:
        data = ndjson.load(f)
    
    traces = defaultdict(list)

    for entry in data:
        try:

            invocation = entry.get('invocation')
            trace_id = entry.get('TraceId')
            text_payload = entry.get('data', '')

            if 'triggerStartTime:: ' in text_payload:
                trigger_start_time_str = text_payload.split('triggerStartTime:: ')[-1].split(',')[0]
                trigger_start_time = int(trigger_start_time_str)
            elif 'triggerStartTime: ' in text_payload:
                trigger_start_time_str = text_payload.split('triggerStartTime: ')[-1].split(',')[0]
                trigger_start_time = int(trigger_start_time_str)
            else:
                trigger_start_time = None

            if 'infra_invoke_time:' in text_payload:
                infra_invoke_time_str = text_payload.split('infra_invoke_time:')[-1].split(',')[0].strip()
                infra_invoke_time = int(infra_invoke_time_str)
            else:
                infra_invoke_time = None

            if 'runtime:' in text_payload:
                runtime = text_payload.split('runtime:')[-1].split(',')[0].strip()
            else:
                runtime = None

            if trace_id and trigger_start_time is not None and infra_invoke_time is not None:
                traces[trace_id].append({
                    'triggerStartTime': trigger_start_time,
                    'infra_invoke_time': infra_invoke_time,
                    'runtime': runtime,
                    'invocation': invocation
                })

        except (IndexError, ValueError) as e:
        
            print(f"Error processing entry: {entry}, error: {e}")
            continue

    # Calculate time differences and prepare output
    output = []
    for trace_id, events in traces.items():
        for event in events:
            trigger_start_time = event['triggerStartTime']
            infra_invoke_time = event['infra_invoke_time']
            runtime = event['runtime']
            invocation = event['invocation']
            
            if trigger_start_time > 0 and infra_invoke_time > 0:
                trigger_latency = abs(trigger_start_time - infra_invoke_time)
            else:
                print('Missing value for subtracting')
            output.append({
                'traceId': trace_id,
                'runtime': runtime,
                'invocation': invocation,
                'trigger_latency': trigger_latency
            })

    return pd.DataFrame(output)

file_path = './request_log.ndjson'
df = process_ndjson(file_path)

# Function to create bar graph for cold and warm invocations
def create_bar_graph(df, invocation_type):
    df_filtered = df[df['invocation'] == invocation_type]
    trace_ids = df_filtered['traceId']
    latencies = df_filtered['trigger_latency']
    runtimes = df_filtered['runtime']

    colors = {'javascript': 'blue', 'python': 'green', 'java': 'red'}
    bar_colors = [colors.get(runtime, 'grey') for runtime in runtimes]

    plt.figure(figsize=(10, 6))
    plt.bar(trace_ids, latencies, color=bar_colors)
    plt.xlabel('Trace ID')
    plt.ylabel('Latency (ms)')
    plt.title(f'Trigger Latency by Trace ID and Runtime ({invocation_type.capitalize()} Invocation)')

    handles = [plt.Rectangle((0,0),1,1, color=color) for color in colors.values()]
    labels = colors.keys()
    plt.legend(handles, labels, title='Runtime')

    plt.xticks(rotation=45, ha='right')

    plt.tight_layout()
    plt.show()

# Create graphs for cold and warm invocations
create_bar_graph(df, 'cold')
create_bar_graph(df, 'warm')
