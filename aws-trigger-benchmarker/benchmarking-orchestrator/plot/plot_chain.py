import json
import ndjson
import pandas as pd

 

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
 


# Processing records
time_diffs = []
records = read_ndjson_file('./logs.ndjson')

trace_dict = {}
for record in records:
    # print(record)
    print(record['triggerStartTime'])
    print(record['TraceId'])

# Dictionary to accumulate data
data_accumulator = {}

for record in records:
    trace_id = record['TraceId']
    
    if record['eventType'] == 'SNS':
        trace_id = trace_id.strip('"')

    # Prepared to collect invoke times
    invoke_times = []

    # Handling HTTP events which have two sources of invoke_time because we wanted to log every invocation in Cloud provider it stores the invocation from benchmarking orchestrator
    if record['eventType'] == 'HTTP':
        
        query_invoke_time_str = record.get('queryStringParameters', {}).get('invoke_time', None)
        if query_invoke_time_str:
            try:
                query_invoke_time = int(query_invoke_time_str)  
                invoke_times.append(query_invoke_time)
            except ValueError:
                print(f"Error converting invoke_time to int: {query_invoke_time_str}")
        
 
        direct_invoke_time_str = record.get('invoke_time', None)
        if direct_invoke_time_str:
            try:
                direct_invoke_time = int(direct_invoke_time_str)  
                invoke_times.append(direct_invoke_time)
            except ValueError:
                print(f"Error converting invoke_time to int: {direct_invoke_time_str}")
    else:
      
        direct_invoke_time_str = record.get('invoke_time', None)
        if direct_invoke_time_str:
            try:
                direct_invoke_time = int(direct_invoke_time_str)  
                invoke_times.append(direct_invoke_time)
            except ValueError:
                print(f"Error converting invoke_time to int: {direct_invoke_time_str}")

    trigger_start_time_str = record['triggerStartTime']
    try:
        trigger_start_time = int(trigger_start_time_str) 
    except ValueError:
        print(f"Error converting triggerStartTime to int: {trigger_start_time_str}")
        continue  

    if trace_id in data_accumulator:
       
        for invoke_time in invoke_times:
            if len(data_accumulator[trace_id]['invokeTimes']) < 4:
                data_accumulator[trace_id]['invokeTimes'].append(invoke_time)
        if len(data_accumulator[trace_id]['triggerStartTimes']) < 4:
            data_accumulator[trace_id]['triggerStartTimes'].append(trigger_start_time)
    else:
        
        data_accumulator[trace_id] = {
            'TraceId': trace_id,
            'eventType': record['eventType'],
            'invokeTimes': invoke_times,
            'triggerStartTimes': [trigger_start_time]
        }


data_for_df = []

for key, value in data_accumulator.items():
    print(value)
   
    min_length = min(len(value['invokeTimes']), len(value['triggerStartTimes']))
    if min_length > 0:
        latencies = [
            abs(value['triggerStartTimes'][i] - value['invokeTimes'][i])
            for i in range(min_length)
        ]
        latencies.sort()
    else:
        latencies = []

    data_for_df.append({
        'TraceId': key,
        'eventType': value['eventType'],
        'invokeTimes': value['invokeTimes'],
        'triggerStartTimes': value['triggerStartTimes'],
        'latency': latencies
    })

# Create a DataFrame
df = pd.DataFrame(data_for_df)

df_exploded = df.explode('latency')


df_exploded.set_index('TraceId', inplace=True)


df_exploded['HTTP Latency'] = None
df_exploded['Message Latency'] = None
df_exploded['Storage Latency'] = None
df_exploded['Database Latency'] = None

latency_columns = ['HTTP Latency', 'Message Latency', 'Storage Latency', 'Database Latency']
grouped = df_exploded.groupby(df_exploded.index)
for trace_id, group in grouped:
    for i, (index, row) in enumerate(group.iterrows()):
        column = latency_columns[i % 4]
        df_exploded.at[index, column] = row['latency']


df_exploded.drop(columns=['eventType', 'invokeTimes', 'triggerStartTimes', 'latency'], inplace=True)


df_final = df_exploded.reset_index()


df_final['Total Latency'] = df_final[latency_columns].sum(axis=1) 


df_final.to_csv('chain-data/aws_chain_latency.csv', index=False)


print(df_final)


df.to_csv('chain-data/aws_chain_latency_data.csv', index=False)
print(df)
 