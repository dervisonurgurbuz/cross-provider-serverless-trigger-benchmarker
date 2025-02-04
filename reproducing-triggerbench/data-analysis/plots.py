"""
Generates all plots by loading and analyzing all executions
"""

# %% Imports
import sys
from pathlib import Path
import numpy as np
from data_importer import *
from plotnine import *
from mizani.palettes import brewer_pal

# Configure logging
logging.basicConfig(stream=sys.stdout, level=logging.INFO)


# %% Load data
execution_paths = find_execution_paths(data_path)
print(execution_paths)
trigger_dfs = []
for execution in execution_paths:
    app_config, app_name = read_sb_app_config(execution)
    trigger = read_trigger_csv(execution)
    trigger['provider'] = parse_provider(app_config)
    trigger['label'] = app_config.get('label', None)
    trigger['trigger'] = app_config.get('trigger', None)
    trigger['burst_size'] = app_config.get('burst_size', None)
    trigger_dfs.append(trigger)

# Combine data frames
traces = pd.concat(trigger_dfs)
print(traces)
# %% Preprocess data
warm_traces = filter_traces_warm(traces)
durations = calculate_durations(warm_traces)
durations_long = pd.melt(durations, id_vars=['root_trace_id', 'child_trace_id', 'provider', 'trigger', 'burst_size', 'label'], var_name='duration_type', value_vars=TIMEDELTA_COLS, value_name='duration')
durations_long['duration_ms'] = durations_long['duration'].dt.total_seconds() * 1000

neg_durations = None
# Check for negative timediffs
if not durations_long[durations_long['duration_ms']<0].empty:
    neg_durations = durations_long[durations_long['duration_ms']<0]
    logging.warning(f"Found {len(neg_durations)} timediffs with negative duration. Check `neg_duration`!")
    # Option to filter them out if these are non-problematic exceptional occurrences
    # durations_long = durations_long.drop(durations_long[durations_long['duration_ms']<0].index)

# Select trigger times
trigger_latency = durations_long[(durations_long['label'].str.startswith('constant_1rps_60min')) & (durations_long['duration_type'] == 'trigger_time')]
# trigger_latency = trigger_latency[trigger_latency['trigger'] != 'storage']


# %% Rename and reorder categories
df = trigger_latency.copy()
df['trigger'] = df['trigger'].map(TRIGGER_MAPPINGS)
df['trigger'] = pd.Categorical(df['trigger'],
                                categories=TRIGGER_MAPPINGS.values(),
                                ordered=True)
df['provider'] = df['provider'].map(PROVIDER_MAPPINGS)
df['provider'] = pd.Categorical(df['provider'],
                                categories=PROVIDER_MAPPINGS.values(),
                                ordered=True)
df['duration_type'] = df['duration_type'].map(DURATION_MAPPINGS)
df['duration_type'] = pd.Categorical(df['duration_type'],
                                categories=DURATION_MAPPINGS.values(),
                                ordered=True)

### Plots
# %% Trigger latency plot for Azure
# Aggregate for annotating summary stats
df_agg = df.groupby(['provider', 'trigger']).agg(
    count_latency=('duration_ms', lambda x: x.count()),
    min_latency=('duration_ms', lambda x: x.min()),
    mean_latency=('duration_ms', lambda x: x.mean()),
    p50_latency=('duration_ms', lambda x: x.quantile(0.5)),
    p75_latency=('duration_ms', lambda x: x.quantile(0.75)),
    p95_latency=('duration_ms', lambda x: x.quantile(0.95)),
    p99_latency=('duration_ms', lambda x: x.quantile(0.99)),
    max_latency=('duration_ms', lambda x: x.max()),
    cv_latency=('duration_ms', lambda x: np.std(x, ddof=1) / np.mean(x) * 100 )
)
df_agg = df_agg.reset_index().dropna()
# Write to CSV
# df_agg.to_csv(f"{plots_path}/df_agg.csv")

offset_path = script_dir / 'df_agg_offsets.csv'
df_agg_offsets = pd.read_csv(offset_path)
df_agg = pd.merge(df_agg, df_agg_offsets, on=['provider', 'trigger'], suffixes=('', '_offset'))

# df_split = pd.merge(df, df_agg_offsets, on=['provider', 'trigger'], suffixes=('', '_offset'))
# df_split['trigger'] = df_split['trigger'].astype('category')
# df_split['trigger'].cat.reorder_categories(TRIGGER_MAPPINGS.values(), inplace=True)

# Merge the DataFrames
df_split = pd.merge(df, df_agg_offsets, on=['provider', 'trigger'], suffixes=('', '_offset'))

# Convert 'trigger' column to categorical type
df_split['trigger'] = df_split['trigger'].astype('category')

# Get old categories and new categories
old_categories = df_split['trigger'].cat.categories.tolist()
new_categories = list(TRIGGER_MAPPINGS.values())
print(old_categories)
print(new_categories)

# Ensure new categories contain the same items as the old categories
if set(new_categories) != set(old_categories):
    raise ValueError("The new categories must contain the same items as the old categories.")

# Reorder categories without inplace
df_split['trigger'] = df_split['trigger'].cat.reorder_categories(new_categories, ordered=True)

def format_labels(breaks):
    return ["{:.0f}".format(l) for l in breaks]
breakdown_colors = ['#fdb462','#80b1d3','#d9ffcf','#bebada','#ffffb3','#8dd3c7', '#fccde5','#b3de69']


# NOTE: The mapping is implicitly defined based on the order
# 8 linestyles are required to cover the 8 Azure + 3 AWS trigger types
linestyles = (
    # HTTP: solid
    (0, ()),
    # # Timer: dotted
    # (0, (1, 1)),
    # Queue: dotted
    (0, (1, 1)),
    # # Database: dashdotted
    # (0, (3, 5, 1, 5)),
    # Storage: dashed
    (0, (5, 5)),
    # # Stream (Event Hub): solid
    # (0, ()),
    # # Message (Service Bus): dashdotted
    # (0, (3, 5, 1, 5, 1, 5)),
    # # Event (Event Grid): dashed
    # (0, (5, 5)),
)

brewer_colors = brewer_pal(type='qual', palette=2, direction=1)(8)
brewer_colors_list = ['#1B9E77', '#D95F02', '#7570B3', '#E7298A', '#66A61E', '#E6AB02', '#A6761D', '#666666']

brewer_colors_custom = [
    # HTTP: Dark cyan - lime green
    '#1B9E77',
 
    '#D95F02',
    # # Database: Bright pink
    # '#E7298A',
    # Storage: Slightly desaturated blue.
    '#7570B3',
    # # Stream: Vivid orange (lighter)
    # '#E6AB02',
    # # Message: Dark green.
    # '#66A61E',
    # # Event: Strong cyan
    # '#09ADBB',
]
trigger_colors = brewer_colors_custom
p = (
    ggplot(df_split)
    + aes(x='duration_ms', color='trigger', fill='trigger')
    + stat_ecdf(aes(linetype='trigger'), alpha=0.9, size=0.7)
    + scale_linetype_manual(linestyles)
  
    + geom_vline(df_agg, aes(xintercept='p50_latency', color='trigger'), linetype='dotted', show_legend=False, alpha=0.5)
 
    + geom_text(df_agg, aes(label='p50_latency', x='p50_latency+x_offset', y='0.5+y_offset', color='trigger'), format_string='{:.0f}', show_legend=False, size=10)
    + facet_wrap('provider_split', nrow=3)  # scales = 'free_x'
    + scale_x_log10(labels=format_labels)
    # + xlim(0, 400)
    # + xlim(0, 2000)
    # + xlim(0, 5000)
    # + xlim(0, 10000)
    + scale_color_manual(trigger_colors)
    + labs(x='Trigger Latency (ms)', y="Empirical Cumulative Distribution Function (ECDF)", color='Trigger Type', linetype='Trigger Type')
    + theme_light(base_size=12)
    + theme(
        figure_size=(5.8, 6.2),
        legend_position='top',
        legend_direction='horizontal',
        legend_title_align='center'
        # legend_position(theme_element='top')
        # subplots_adjust={'hspace': 0.5}
    )
)
p.save(path=f"{plots_path}", filename=f"trigger_latency.pdf")

# %%
