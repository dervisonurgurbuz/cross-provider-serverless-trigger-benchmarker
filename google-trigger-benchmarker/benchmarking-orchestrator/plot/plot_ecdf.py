import ndjson
import json
from collections import defaultdict
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import matplotlib.pyplot as plt 

def process_ndjson(file_path):
    # Read NDJSON file
    with open(file_path, 'r') as f:
        data = ndjson.load(f)
    
    traces = defaultdict(list)

    # Procesing the data
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

        except (IndexError, ValueError) as e:
           
            print(f"Error processing entry: {entry}, error: {e}")
            continue
  
    with open(request_data_path, 'r') as f:
        new_data = []
        for line in f:
            line = line.strip()
            if line:  
                try:
                    new_data.append(json.loads(line))
                except json.JSONDecodeError as e:
                    print(f"Error decoding JSON in line: {line}, error: {e}")
                    continue        

    for entry in new_data:
        trace_id = entry.get('TraceId')
        # request_time = entry.get('requestTime')
        invocation = entry.get('invocation')
        trigger_type = entry.get('triggerType')

        if trigger_type == 'pubsub':
            trigger_type = 'queue'

        if trace_id and invocation:
            traces[trace_id].append({'invocation': invocation})
        
        if trace_id and trigger_type:
            traces[trace_id].append({'triggerType': trigger_type})
            
  

    # Calculate time differences and prepare output
    output = []
    for trace_id, events in traces.items():
        start_times = [event['start_time'] for event in events if 'start_time' in event]
        trigger_type = next((event['triggerType'] for event in events if 'triggerType' in event), None)
        invocation = next((event['invocation'] for event in events if 'invocation' in event), None)
        

        # if len(start_times) >2:
        start_times.sort()
        
        # Calculate two consecutive time differences if at least three start times are available
        if(len(start_times)>=2):
            trigger_latency =  start_times[1] - start_times[0] 
            
            output.append({
                'traceId': trace_id,
                'invocation': invocation,
                'triggerType': trigger_type,
                'start_times': start_times,
               
                'trigger_latency': trigger_latency
            })


    return pd.DataFrame(output)


# Path to your NDJSON file
file_path = './logs.ndjson'
request_data_path = './request_log.ndjson'

def plot_and_save_time_diff_by_trigger_type(df):
    trigger_types = df['triggerType'].dropna().unique()
    color_palette = plt.get_cmap('tab10')  
    colors = {trigger: color_palette(i) for i, trigger in enumerate(trigger_types)}

    # Define a function to plot a bar chart
    def plot_simple_bar_chart(df_subset, invocation_type):
        if df_subset.empty:
            print(f"No data available for {invocation_type} invocations.")
            return

        fig, ax = plt.subplots(figsize=(12, 6))  

        
        grouped_df = df_subset.groupby(['traceId', 'triggerType']).sum().reset_index()

        # Plotting bar chart
        for trigger in grouped_df['triggerType'].unique():
            subset = grouped_df[grouped_df['triggerType'] == trigger]
            ax.bar(subset['traceId'], subset['trigger_latency'], label=trigger, color=colors[trigger])

        ax.set_title(f'{invocation_type.capitalize()} Invocations: Trigger Latency by Trace ID', fontsize=15)
        ax.set_xlabel('Trace ID', fontsize=12)
        ax.set_ylabel('Trigger Latency (ms)', fontsize=12)
        ax.set_xticks(range(len(grouped_df['traceId'].unique()))) 
        ax.set_xticklabels(grouped_df['traceId'].unique(), rotation=90) 

        ax.legend(title='Trigger Type') 
        plt.tight_layout()
        
        plt.savefig(f"./plots/{invocation_type}_invocations_latency.pdf")
        plt.close(fig) 

    # Plot and save for each invocation type
    plot_simple_bar_chart(df[df['invocation'] == 'warm'], 'warm')
    plot_simple_bar_chart(df[df['invocation'] == 'cold'], 'cold')
   
    

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
    'queue': '#09ADBB', 
    'database': '#E7298A',
}

# Default color and linestyle if not specified
default_color = '#666666'  
default_linestyle = (0, (3, 1))  

# Function to compute ECDF
def compute_ecdf(data):
    """Compute ECDF for a one-dimensional array of measurements."""
    n = len(data)  
    x = np.sort(data)
    y = np.arange(1, n+1) / n
    return x, y

# Function to plot ECDF for each trigger type
def plot_ecdf_by_trigger_type(df_subset, invocation_type):
    print(df_subset)
    plt.figure(figsize=(10, 6))

    unique_trigger_types = sorted(df_subset['triggerType'].dropna().unique())  
    for trigger_type in unique_trigger_types:
        subset = df_subset[df_subset['triggerType'] == trigger_type]
        trigger_latencies = subset['trigger_latency'].values

        if len(trigger_latencies) > 0:  
            x, y = compute_ecdf(trigger_latencies)
            median = np.median(trigger_latencies)
            median = int(median) if median.is_integer() else round(median)
            color = colors.get(trigger_type.lower(), default_color)
            linestyle = line_styles.get(trigger_type.lower(), default_linestyle)

            label_text = f"{trigger_type.upper()} (median: {median} ms)" if 'http' in trigger_type.lower() else f"{trigger_type.capitalize()} (median: {median} ms)"

            plt.plot(x, y, label=label_text, linestyle=linestyle, color=color)

            plt.axvline(x=median, color=color, linestyle='--', linewidth=1)

    plt.legend(title='Trigger Type', bbox_to_anchor=(0.5, -0.2), loc='upper center', ncol=2)
    min_time = min(df_subset['trigger_latency'])
    max_time = max(df_subset['trigger_latency'])
    start_tick = max(0, min_time - (min_time % 500)) if min_time > 500 else 0
    plt.xticks(np.arange(start_tick, max_time + 500, 500))
    plt.title(f'Google ECDF of Trigger Latency by Trigger Type ({invocation_type.capitalize()} Invocation)', fontsize=16)
    plt.xlabel('Trigger Latency (ms)')
    plt.ylabel('Empirical Cumulative Distribution Function (ECDF)')
    plt.grid(True)
    plt.tight_layout(rect=[0, 0, 1, 0.85])  
    plt.savefig(f'./plots/google_ecdf_{invocation_type}_invocations_median.pdf')  
    plt.show()
    plt.clf()  



df = process_ndjson(file_path)

print(df)
plot_ecdf_by_trigger_type(df[df['invocation'] == 'warm'], 'warm')
plot_ecdf_by_trigger_type(df[df['invocation'] == 'cold'], 'cold')