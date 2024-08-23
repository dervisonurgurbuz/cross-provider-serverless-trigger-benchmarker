import ndjson
import json
from collections import defaultdict
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

def process_ndjson(file_path):
    # Read NDJSON file
    with open(file_path, 'r') as f:
        data = ndjson.load(f)
    
    traces = defaultdict(list)

    for entry in data:
        try:
            text_payload = entry.get('textPayload', '')

            trace_id = None
            if 'TraceId:' in text_payload:
                trace_id = text_payload.split('TraceId:')[-1].strip().split()[0]
            elif 'traceId:' in text_payload:
                trace_id = text_payload.split('traceId:')[-1].strip().split()[0]

            
            if 'start: ' in text_payload:
                start_time_str = text_payload.split('start: ')[-1].split(',')[0]
                start_time = int(start_time_str)
            else:
                start_time = None

            if 'infra_action:' in text_payload:
                trigger_type = text_payload.split('infra_action:')[-1].split(',')[0].strip()
            elif 'triggerType:' in text_payload:
                trigger_type = text_payload.split('triggerType:')[-1].split(',')[0].strip()
            else:
                trigger_type = None

            if trace_id and start_time is not None:
                traces[trace_id].append({'start_time': start_time})
            if trace_id and trigger_type:
                traces[trace_id].append({'triggerType': trigger_type})

        except (IndexError, ValueError) as e:
           
            print(f"Error processing entry: {entry}, error: {e}")
            continue

    with open(request_data_path, 'r') as f:
        new_data = []
        for line in f:
            line = line.strip()
            if line:  # Skipping empty lines
                try:
                    new_data.append(json.loads(line))
                except json.JSONDecodeError as e:
                    print(f"Error decoding JSON in line: {line}, error: {e}")
                    continue        

    for entry in new_data:
        trace_id = entry.get('TraceId')

        invocation = entry.get('invocation')

        if trace_id and invocation:
            traces[trace_id].append({'invocation': invocation})
            
   
    output = []
    for trace_id, events in traces.items():
        start_times = [event['start_time'] for event in events if 'start_time' in event]
        trigger_type = next((event['triggerType'] for event in events if 'triggerType' in event), None)
        invocation = next((event['invocation'] for event in events if 'invocation' in event), None)
        

        start_times.sort()
        
        # Calculate two consecutive time differences if at least three start times are available
        if(len(start_times)>=2):
            trigger_latency =  start_times[1] - start_times[0] 
            
            output.append({
                'traceId': trace_id,
                'invocation': invocation,
                'triggerType': trigger_type,
                'start_times': start_times,
                # 'first_time_diff': first_time_diff,
                'trigger_latency': trigger_latency
            })

    return pd.DataFrame(output)


# Path to your NDJSON file
file_path = './logs.ndjson'
request_data_path = './request_log.ndjson'

def plot_and_save_time_diff_by_trigger_type(df):
    # Create a consistent color mapping for trigger types across all plots
    trigger_types = df['triggerType'].dropna().unique()
    color_palette = plt.get_cmap('tab10')  # Choose a colormap with enough colors
    colors = {trigger: color_palette(i) for i, trigger in enumerate(trigger_types)}

    # Define a function to plot a simple bar chart
    def plot_simple_bar_chart(df_subset, invocation_type):
        if df_subset.empty:
            print(f"No data available for {invocation_type} invocations.")
            return

        fig, ax = plt.subplots(figsize=(12, 6))  # Adjust figure size as needed

        # Group the DataFrame by traceId to sum latencies by traceId and triggerType 
        grouped_df = df_subset.groupby(['traceId', 'triggerType']).sum().reset_index()

        # Plotting bar chart
        for trigger in grouped_df['triggerType'].unique():
            subset = grouped_df[grouped_df['triggerType'] == trigger]
            ax.bar(subset['traceId'], subset['trigger_latency'], label=trigger, color=colors[trigger])

        ax.set_title(f'{invocation_type.capitalize()} Invocations: Trigger Latency by Trace ID', fontsize=15)
        ax.set_xlabel('Trace ID', fontsize=12)
        ax.set_ylabel('Trigger Latency (ms)', fontsize=12)
        ax.set_xticks(range(len(grouped_df['traceId'].unique())))  
        ax.set_xticklabels(grouped_df['traceId'].unique(), rotation=90)  # Rotating trace IDs for better readability

        ax.legend(title='Trigger Type') 
        plt.tight_layout()
        
        plt.savefig(f"./plots/{invocation_type}_invocations_latency.pdf")
        plt.close(fig)  # Close the figure to free up memory

    # Plot and save for each invocation type
    plot_simple_bar_chart(df[df['invocation'] == 'warm'], 'warm')
    plot_simple_bar_chart(df[df['invocation'] == 'cold'], 'cold')
plot_and_save_time_diff_by_trigger_type(process_ndjson(file_path))
