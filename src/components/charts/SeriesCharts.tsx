import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
import { chartColor, chartTheme, chartTooltipStyle } from './chartTheme';

export function ChartFrame({
  children,
  label,
  height = 220,
}: {
  children: React.ReactNode;
  label: string;
  height?: number;
}) {
  return (
    <div role="img" aria-label={label} className="w-full" style={{ height }}>
      {children}
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
    <ChartFrame label={label} height={height}>
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
          <Tooltip contentStyle={chartTooltipStyle()} />
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
    <ChartFrame label={label} height={height}>
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
          <Tooltip contentStyle={chartTooltipStyle()} />
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
              opacity={currentKey || partialKey ? 0.9 : 1}
            />
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
    <ChartFrame label={label}>
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
}: {
  streams: Record<string, (number | null)[]>;
  channels?: { key: string; label: string; color: string }[];
  onHover?: (index: number | null) => void;
  zones?: { low: number; high: number; color: string }[];
}) {
  const available = (
    channels ?? [
      { key: 'speed', label: 'Speed', color: 'accent' },
      { key: 'hr', label: 'Heart rate', color: 'danger' },
      { key: 'elevation', label: 'Elevation', color: 'success' },
      { key: 'cadence_spm', label: 'Cadence', color: 'warning' },
      { key: 'power', label: 'Power', color: 'celebrate' },
    ]
  ).filter((channel) => streams[channel.key]?.some((value) => value !== null));
  const count = Math.max(0, ...Object.values(streams).map((values) => values.length));
  const data = Array.from({ length: Math.min(count, 1500) }, (_, index) => ({
    index,
    ...Object.fromEntries(
      available.map((channel) => [channel.key, streams[channel.key]?.[index] ?? null]),
    ),
  }));
  return (
    <div className="space-y-4">
      {available.map((channel) => (
        <ChartFrame key={channel.key} label={`${channel.label} over activity`} height={150}>
          <p className="mb-1 text-xs font-medium text-text-2">{channel.label}</p>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart
              data={data}
              syncId="activity"
              onMouseMove={(event) =>
                onHover?.(
                  typeof event?.activeTooltipIndex === 'number' ? event.activeTooltipIndex : null,
                )
              }
              onMouseLeave={() => onHover?.(null)}
              margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
            >
              <XAxis dataKey="index" hide />
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
