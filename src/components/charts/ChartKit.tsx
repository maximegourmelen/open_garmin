import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartFrame, BarSeries } from './SeriesCharts';
import { chartColor, chartTheme, chartTooltipStyle } from './chartTheme';
import { bedtimeTick, yAxisConfig } from './axis';

export function TrendLine({
  title,
  label,
  data,
  value,
  reading,
  band,
  kind = 'plain',
  size = 'M',
  unit = '',
}: {
  title?: string;
  label: string;
  data: { date: string; value: number | null }[];
  value?: string;
  reading?: string;
  band?: [number, number];
  kind?: 'plain' | 'sleep' | 'bedtime' | 'pace';
  size?: 'S' | 'M' | 'L';
  unit?: string;
}) {
  const axis = yAxisConfig(kind, unit);
  const detailUnit = unit && kind !== 'plain' ? ` ${unit}` : '';
  const last = [...data].reverse().find((point) => point.value !== null);
  return (
    <ChartFrame
      title={title}
      value={value}
      reading={reading}
      label={`${label}. ${data.length} days, ${data.filter((point) => point.value !== null).length} readings.`}
      size={size}
      table={{
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'value', label },
        ],
        rows: data,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="2 4" vertical={false} />
          {band && (
            <ReferenceArea
              y1={band[0]}
              y2={band[1]}
              fill={chartColor('data-muted')}
              fillOpacity={0.4}
            />
          )}
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartColor('text-3'), fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartColor('text-3'), fontSize: 12 }}
            tickCount={4}
            tickFormatter={axis.tickFormatter}
            reversed={axis.reversed}
            domain={kind === 'bedtime' ? [360, 1440] : ['auto', 'auto']}
          />
          <Tooltip
            contentStyle={chartTooltipStyle()}
            filterNull={false}
            formatter={(v) => [
              v == null ? 'No data' : `${axis.tickFormatter(Number(v))}${detailUnit}`,
              label,
            ]}
          />
          <Line
            type="linear"
            dataKey="value"
            stroke={chartColor('data-1')}
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls={false}
          />
          {last?.value !== null && last?.value !== undefined && (
            <ReferenceDot
              x={last.date}
              y={last.value}
              r={3}
              fill={chartColor('data-1')}
              stroke="none"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function Bars({
  label,
  data,
  goal,
  size = 'M',
}: {
  label: string;
  data: { date: string; value: number | null; partial?: boolean }[];
  goal?: number;
  size?: 'S' | 'M' | 'L';
}) {
  return (
    <BarSeries
      label={label}
      data={data}
      series={[{ key: 'value', label, color: 'data-1' }]}
      xKey="date"
      goal={goal}
      partialKey="partial"
      height={{ S: 120, M: 200, L: 280 }[size]}
    />
  );
}

export function RangeBars({
  label,
  data,
}: {
  label: string;
  data: { date: string; low: number | null; high: number | null }[];
}) {
  const valid = data
    .flatMap((point) => [point.low, point.high])
    .filter((v): v is number => v !== null);
  const min = Math.min(...valid, 0);
  const max = Math.max(...valid, 1);
  const x = (v: number) => 70 + ((v - min) / Math.max(1, max - min)) * 420;
  return (
    <ChartFrame
      label={`${label}. ${data.length} ranges.`}
      size="M"
      table={{
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'low', label: 'Low' },
          { key: 'high', label: 'High' },
        ],
        rows: data,
      }}
    >
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 500 ${Math.max(40, data.length * 24)}`}
        className="h-full w-full"
      >
        {data.map((point, index) => (
          <g key={point.date}>
            <text x="0" y={index * 24 + 16} fill={chartColor('text-3')} fontSize="12">
              {point.date.slice(5)}
            </text>
            {point.low !== null && point.high !== null && (
              <rect
                x={x(point.low)}
                y={index * 24 + 7}
                width={Math.max(2, x(point.high) - x(point.low))}
                height="10"
                rx="2"
                fill={chartColor('data-1')}
              />
            )}
          </g>
        ))}
      </svg>
    </ChartFrame>
  );
}

export function BulletChart({
  label,
  value,
  goal,
  max,
  range,
}: {
  label: string;
  value: number | null;
  goal?: number;
  max: number;
  range?: [number, number];
}) {
  const x = (v: number) => Math.max(0, Math.min(100, (v / max) * 100));
  return (
    <ChartFrame
      label={`${label}: ${value === null ? 'No data' : value}`}
      size="S"
      table={{
        columns: [
          { key: 'metric', label: 'Metric' },
          { key: 'value', label: 'Value' },
          { key: 'goal', label: 'Goal' },
        ],
        rows: [{ metric: label, value, goal }],
      }}
    >
      <div className="space-y-2 pt-8">
        <p className="type-label text-text-2">{label}</p>
        <div className="relative h-5 rounded-sm bg-surface-2">
          {range && (
            <div
              className="absolute inset-y-0 bg-data-muted/40"
              style={{ left: `${x(range[0])}%`, width: `${x(range[1]) - x(range[0])}%` }}
            />
          )}
          {value !== null && (
            <div
              className="absolute inset-y-1 left-0 rounded-r-sm bg-data-1"
              style={{ width: `${x(value)}%` }}
            />
          )}
          {goal !== undefined && (
            <div
              className="absolute inset-y-0 border-l border-dashed border-text-3"
              style={{ left: `${x(goal)}%` }}
            />
          )}
        </div>
      </div>
    </ChartFrame>
  );
}

export function ClockScatter({
  label,
  data,
  usual,
}: {
  label: string;
  data: { date: string; minutes_from_noon: number | null }[];
  usual?: [number, number];
}) {
  const points = data.map((point, index) => ({ ...point, index }));
  return (
    <ChartFrame
      label={`${label}. ${data.length} nights.`}
      size="M"
      table={{
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'minutes_from_noon', label: 'Time' },
        ],
        rows: data,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="2 4" vertical={false} />
          {usual && (
            <ReferenceArea
              y1={usual[0]}
              y2={usual[1]}
              fill={chartColor('data-muted')}
              fillOpacity={0.4}
            />
          )}
          <XAxis
            type="number"
            dataKey="index"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartColor('text-3'), fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="minutes_from_noon"
            domain={[360, 1440]}
            reversed
            tickCount={4}
            tickFormatter={bedtimeTick}
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartColor('text-3'), fontSize: 12 }}
          />
          <Tooltip contentStyle={chartTooltipStyle()} formatter={(v) => bedtimeTick(Number(v))} />
          <Scatter
            data={points.filter((point) => point.minutes_from_noon !== null)}
            fill={chartColor('data-1')}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
