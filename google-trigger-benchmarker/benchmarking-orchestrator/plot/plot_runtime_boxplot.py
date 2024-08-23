import json
import matplotlib.pyplot as plt
import ndjson
import pandas as pd
from collections import defaultdict
import seaborn as sns
import numpy as np

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
                'runtime': runtime.capitalize(),  
                'invocation': invocation,
                'trigger_latency': trigger_latency
            })

    return pd.DataFrame(output)


file_path = './request_log.ndjson'
df = process_ndjson(file_path)
filtered_df = df[(df['trigger_latency'] > 400) & (df['invocation'] == 'warm')]
print(filtered_df)

# Function to create box plot for cold and warm invocations
def create_box_plot(df):
    plt.figure(figsize=(12, 8))
    sns.boxplot(x='runtime', y='trigger_latency', hue='invocation', data=df, 
            palette={'cold': 'blue', 'warm': 'red'},
            order=['Java', 'Python', 'Javascript'],
            hue_order=['cold', 'warm'])
    plt.title('Google Trigger Latency by Runtime and Invocation Type', fontsize=16)
    plt.xlabel('Runtime', fontsize=14)
    plt.ylabel('Trigger Latency (ms)', fontsize=14)
    plt.xticks(fontsize=12)

    min_time = min(df['trigger_latency'])
    max_time = max(df['trigger_latency'])
    start_tick = max(0, min_time - (min_time % 200)) if min_time > 200 else 0
    plt.yticks(np.arange(start_tick, max_time + 200, 200),fontsize=12)

    plt.legend(title='Invocation Type', title_fontsize='13', fontsize='11')
    plt.grid(True, linestyle='--', linewidth=0.5)
    plt.tight_layout()
    plt.savefig('./plots/google_runtime_boxplot.pdf')
    plt.show()

# Create box plot for cold and warm invocations and save it
save_path = './plots/google_runtime_boxplot.pdf'
create_box_plot(df)
