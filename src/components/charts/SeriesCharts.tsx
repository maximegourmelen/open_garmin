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
import { chartColor, chartTheme, chartTooltipStyle } from './chartTheme';
import type { StreamData } from '../../lib/types';

export function ChartFrame({
  children,
  label,
  height = 220,
  table,
}: {
  children: React.ReactNode;
  label: string;
  height?: number;
  table?: { columns: { key: string; label: string }[]; rows: Record<string, unknown>[] };
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <div className="w-full">
      <div role="img" aria-label={label} className="w-full" style={{ height }}>
        {children}
      </div>
      {table && (
        <>
          <button
            type="button"
            className="mt-1 rounded-control px-2 py-1 text-xs text-accent hover:bg-accent-soft"
            aria-expanded={showTable}
            onClick={() => setShowTable((value) => !value)}
          >
            {showTable ? 'Hide table' : 'Show as table'}
          </button>
          {showTable && (
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">{label}</caption>
                <thead>
                  <tr>
                    {table.columns.map((column) => (
                      <th key={column.key} scope="col" className="p-1">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, index) => (
                    <tr key={index}>
                      {table.columns.map((column) => (
                        <td key={column.key} className="border-t border-border p-1">
                          {row[column.key] == null ? 'No data' : String(row[column.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const axis = { fontSize: 11, fill: chartTheme.text };

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
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
          {band && (
            <ReferenceArea
              y1={band[0]}
              y2={band[1]}
              fill={chartColor('hrv-balanced')}
              fillOpacity={0.12}
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
            type="monotone"
            dataKey={dataKey}
            stroke={chartColor(color)}
            strokeWidth={2.5}
            connectNulls={false}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
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
          <defs>
            <pattern
              id="partial-week-hatch"
              width="5"
              height="5"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="5" height="5" fill={chartColor('accent')} />
              <line x1="0" x2="0" y1="0" y2="5" stroke={chartColor('surface')} strokeWidth="2" />
            </pattern>
          </defs>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={axis} tickLine={false} axisLine={false} />
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={chartTooltipStyle()}
            filterNull={false}
            formatter={(value, name) => [value == null ? 'No data' : value, name]}
          />
          {goal !== undefined && (
            <ReferenceLine y={goal} stroke={chartColor('text-2')} strokeDasharray="4 3" />
          )}
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              stackId={item.stackId}
              fill={chartColor(item.color)}
              radius={[3, 3, 0, 0]}
            >
              {data.map((row, index) => (
                <Cell
                  key={index}
                  fill={
                    partialKey && row[partialKey]
                      ? 'url(#partial-week-hatch)'
                      : chartColor(item.color)
                  }
                  fillOpacity={
                    currentKey && data.some((entry) => entry[currentKey]) && !row[currentKey]
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
                type="monotone"
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
