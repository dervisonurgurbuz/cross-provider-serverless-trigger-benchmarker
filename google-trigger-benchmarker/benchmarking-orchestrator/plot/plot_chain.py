import ndjson
import pandas as pd

def process_ndjson(file_path):
    
    with open(file_path, 'r') as f:
        data = ndjson.load(f)
    traces = {}

    # Processing data
    for entry in data:
        try:
            text_payload = entry.get('textPayload', '')

           
            trace_id = None
            if 'traceId:' in text_payload:
                trace_id = text_payload.split('traceId:')[-1].split(',')[0].strip()

            if not trace_id:
                continue

            if trace_id not in traces:
                traces[trace_id] = {'start_times': [], 'invoke_times': [], 'trigger_latencies': []}

            
            if 'start: ' in text_payload:
                start_time_str = text_payload.split('start: ')[1].split(',')[0].strip()
                start_time = int(start_time_str)
                traces[trace_id]['start_times'].append(start_time)

            
            if 'invoke_time:' in text_payload:
                invoke_time_str = text_payload.split('invoke_time: ')[1].split(',')[0].strip()
                invoke_time = int(invoke_time_str)
                traces[trace_id]['invoke_times'].append(invoke_time)

            if 'invoke_time:' in text_payload:
                parts = text_payload.split('invoke_time:')
                if len(parts) > 2:  
                    second_invoke_time_str = parts[2].split(',')[0].strip()
                    if second_invoke_time_str.isdigit():
                        second_invoke_time = int(second_invoke_time_str)
                        traces[trace_id]['invoke_times'].append(second_invoke_time)

        except Exception as e:
            print(f"Error processing entry: {entry}, error: {e}")


    # Sort and calculate latencies

    for trace_id, times in traces.items():
        if times['start_times']:
            times['start_times'].sort()
        if times['invoke_times']:
            times['invoke_times'].sort()
        print(times['start_times'])
        print(times['invoke_times'])
        # Calculating latencies
        if len(times['start_times']) == 4 and len(times['invoke_times'])==4:
            for i in range(4):
                latency = abs(times['invoke_times'][i] - times['start_times'][i])
                times['trigger_latencies'].append(latency)


    # Prepare DataFrame
    df_data = []
    for trace_id, times in traces.items():
        latency_data = times['trigger_latencies']
        df_data.append({
            'TraceId': trace_id,
            'HTTP Latency': latency_data[0] if len(latency_data) > 0 else 0,
            'Message Latency': latency_data[1] if len(latency_data) > 1 else 0,
            'Storage Latency': latency_data[2] if len(latency_data) > 2 else 0,
            'Database Latency': latency_data[3] if len(latency_data) > 3 else 0,
            'Total Latency': sum(latency_data)
        })

    df = pd.DataFrame(df_data)
    return df

# Path to your NDJSON file
file_path = './logs.ndjson'
df_traces = process_ndjson(file_path)
print(df_traces)
df_traces.to_csv('chain-data/google_chain_latency.csv', index=False)

