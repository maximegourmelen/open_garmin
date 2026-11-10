import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useState } from 'react';
import { DataTable } from '../ui/DataTable';
import { chartColor, chartTheme, chartTooltipStyle } from './chartTheme';
import type { StreamData } from '../../lib/types';

export function ChartFrame({
  children,
  label,
  height = 220,
  table,
  title,
  value,
  reading,
  size,
}: {
  children: React.ReactNode;
  label: string;
  height?: number;
  table?: { columns: { key: string; label: string }[]; rows: Record<string, unknown>[] };
  title?: string;
  value?: string;
  reading?: string;
  size?: 'S' | 'M' | 'L';
}) {
  const [showTable, setShowTable] = useState(false);
  const chartHeight = size ? { S: 120, M: 200, L: 280 }[size] : height;
  return (
    <div className="w-full space-y-3">
      {(title || value || reading) && (
        <header>
          {title && <h3 className="type-heading text-text">{title}</h3>}
          {value && <p className="num-lg mt-1 text-text">{value}</p>}
          {reading && <p className="mt-1 type-body text-text-2">{reading}</p>}
        </header>
      )}
      {!showTable && (
        <div role="img" aria-label={label} className="w-full" style={{ height: chartHeight }}>
          {children}
        </div>
      )}
      {table && (
        <>
          <button
            type="button"
            className="type-caption text-text-2 underline hover:text-text"
            aria-expanded={showTable}
            onClick={() => setShowTable((value) => !value)}
          >
            {showTable ? 'View chart' : 'View as table'}
          </button>
          {showTable && (
            <div className="max-h-72 overflow-auto">
              <DataTable
                caption={label}
                rows={table.rows}
                keyFor={(_, index) => String(index)}
                columns={table.columns.map((column) => ({
                  key: column.key,
                  label: column.label,
                  value: (row: Record<string, unknown>) =>
                    row[column.key] == null ? 'No data' : String(row[column.key]),
                }))}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

const axis = { fontSize: 12, fill: chartColor('text-3') };

export function BandLineChart({
  data,
  dataKey = 'value',
  xKey = 'date',
  label,
  color = 'accent',
  band,
  height = 220,
}: {
  data: Record<string, string | number | null>[];
  dataKey?: string;
  xKey?: string;
  label: string;
  color?: string;
  band?: [number, number];
  height?: number;
}) {
  return (
    <ChartFrame
      label={`${label}. ${data.length} observations.`}
      height={height}
      table={{
        columns: [
          { key: xKey, label: xKey },
          { key: dataKey, label: label },
        ],
        rows: data,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="2 4" vertical={false} />
          {band && (
            <ReferenceArea
              y1={band[0]}
              y2={band[1]}
              fill={chartColor('data-muted')}
              fillOpacity={0.4}
            />
          )}
          <XAxis dataKey={xKey} tick={axis} tickLine={false} axisLine={false} />
          <YAxis tick={axis} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={chartTooltipStyle()}
            filterNull={false}
            formatter={(value, name) => [value == null ? 'No data' : value, name]}
          />
          <Line
            type="linear"
            dataKey={dataKey}
            stroke={chartColor(color)}
            strokeWidth={1.75}
            connectNulls={false}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function BarSeries({
  data,
  series,
  xKey = 'label',
  label,
  goal,
  currentKey,
  partialKey,
  height = 220,
}: {
  data: Record<string, string | number | null | boolean>[];
  series: { key: string; label: string; color: string; stackId?: string }[];
  xKey?: string;
  label: string;
  goal?: number;
  currentKey?: string;
  partialKey?: string;
  height?: number;
}) {
  return (
    <ChartFrame
      label={`${label}. ${data.length} observations.`}
      height={height}
      table={{
        columns: [
          { key: xKey, label: xKey },
          ...series.map(({ key, label: name }) => ({ key, label: name })),
        ],
        rows: data,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey={xKey} tick={axis} tickLine={false} axisLine={false} />
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle()}
            filterNull={false}
            formatter={(value, name) => [value == null ? 'No data' : value, name]}
          />
          {goal !== undefined && (
            <ReferenceLine
              y={goal}
              stroke={chartColor('text-3')}
              strokeDasharray="4 3"
              label={{ value: 'Goal', fill: chartColor('text-3'), fontSize: 12 }}
            />
          )}
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              stackId={item.stackId}
              fill={chartColor(item.color)}
              radius={[2, 2, 0, 0]}
              maxBarSize={24}
              barSize={24}
            >
              {data.map((row, index) => (
                <Cell
                  key={index}
                  fill={chartColor(item.color)}
                  fillOpacity={
                    partialKey && row[partialKey]
                      ? 0.4
                      : currentKey && data.some((entry) => entry[currentKey]) && !row[currentKey]
                        ? 0.45
                        : 1
                  }
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function ScatterPlot({
  data,
  label,
  xLabel,
  yLabel,
  trend,
}: {
  data: { x: number; y: number }[];
  label: string;
  xLabel?: string;
  yLabel?: string;
  trend?: { slope: number; intercept: number };
}) {
  const xs = data.map((point) => point.x);
  const trendData =
    trend && xs.length
      ? [Math.min(...xs), Math.max(...xs)].map((x) => ({ x, y: trend.slope * x + trend.intercept }))
      : [];
  return (
    <ChartFrame
      label={`${label}. ${data.length} observations.`}
      table={{
        columns: [
          { key: 'x', label: xLabel ?? 'X' },
          { key: 'y', label: yLabel ?? 'Y' },
        ],
        rows: data,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name={xLabel} tick={axis} />
          <YAxis type="number" dataKey="y" name={yLabel} tick={axis} />
          <Tooltip contentStyle={chartTooltipStyle()} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill={chartColor('accent')} />
          {trendData.length > 0 && (
            <Scatter
              data={trendData}
              line={{ stroke: chartColor('text-2'), strokeDasharray: '4 3' }}
              fill="transparent"
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function StreamCharts({
  streams,
  channels,
  onHover,
  zones,
  xAxis = 'time',
}: {
  streams: Partial<StreamData>;
  channels?: { key: string; label: string; color: string }[];
  onHover?: (index: number | null) => void;
  zones?: { low: number; high: number; color: string }[];
  xAxis?: 'time' | 'distance';
}) {
  const read = (key: string): (number | null)[] | undefined => streams[key as keyof StreamData];
  const available = (
    channels ?? [
      { key: 'speed', label: 'Speed', color: 'accent' },
      { key: 'hr', label: 'Heart rate', color: 'danger' },
      { key: 'elevation', label: 'Elevation', color: 'success' },
      { key: 'cadence_spm', label: 'Cadence', color: 'warning' },
      { key: 'power', label: 'Power', color: 'celebrate' },
    ]
  ).filter((channel) => read(channel.key)?.some((value) => value !== null));
  const count = Math.max(0, ...Object.values(streams).map((values) => values?.length ?? 0));
  const data = Array.from({ length: Math.min(count, 1500) }, (_, index) => ({
    index,
    x: streams[xAxis]?.[index] ?? index,
    ...Object.fromEntries(
      available.map((channel) => [channel.key, read(channel.key)?.[index] ?? null]),
    ),
  }));
  return (
    <div className="space-y-4">
      {available.map((channel) => (
        <ChartFrame
          key={channel.key}
          label={`${channel.label} over activity. ${data.length} samples.`}
          height={150}
          table={{
            columns: [
              { key: 'x', label: xAxis },
              { key: channel.key, label: channel.label },
            ],
            rows: data,
          }}
        >
          <p className="mb-1 text-xs font-medium text-text-2">{channel.label}</p>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart
              data={data}
              syncId="activity"
              onMouseMove={(event) => {
                const active = event?.activeTooltipIndex;
                const index = active == null ? null : Number(active);
                onHover?.(index !== null && Number.isInteger(index) ? index : null);
              }}
              onMouseLeave={() => onHover?.(null)}
              margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
            >
              <XAxis dataKey="x" hide />
              <YAxis tick={axis} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle()} />
              {channel.key === 'hr' &&
                zones?.map((zone, i) => (
                  <ReferenceArea
                    key={i}
                    y1={zone.low}
                    y2={zone.high}
                    fill={chartColor(zone.color)}
                    fillOpacity={0.08}
                  />
                ))}
              <Area
                type="linear"
                dataKey={channel.key}
                stroke={chartColor(channel.color)}
                fill={chartColor(channel.color)}
                fillOpacity={0.12}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
      ))}
    </div>
  );
}
