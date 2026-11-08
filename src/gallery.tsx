import { useState } from 'react';
import { useTheme } from './app/theme-context';
import { Celebration, CompanionMessage, Pip } from './components/companion';
import type { Pose } from './lib/types';
import { BigNumber, DeltaChip, MetricRow, StatGrid, StatTile } from './components/data';
import {
  BandLineChart,
  BarSeries,
  CalendarHeatmap,
  RingGauge,
  RouteMap,
  ScatterPlot,
  SegmentGauge,
  Sparkline,
  StackedBars,
  StageBar,
  StreamCharts,
  WeekDots,
  ZoneBars,
} from './components/charts';
import {
  Avatar,
  Button,
  Card,
  Dialog,
  Disclosure,
  EmptyState,
  ErrorState,
  Explainer,
  Kbd,
  Pill,
  ProgressBar,
  SegmentedControl,
  Select,
  Skeleton,
  SourceBadge,
  Switch,
  Tabs,
  useToast,
} from './components/ui';

function GalleryToastButton() {
  const toast = useToast();
  return (
    <Button
      onClick={() =>
        toast({ message: 'Your goal was saved', action: { label: 'Undo', onClick: () => {} } })
      }
    >
      Show toast
    </Button>
  );
}

export default function GalleryPage() {
  const theme = useTheme();
  const [range, setRange] = useState('4W');
  const [enabled, setEnabled] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [selected, setSelected] = useState('a');
  const [tab, setTab] = useState('one');
  const days = Array.from({ length: 7 }, (_, i) => ({
    date: `2026-11-0${i + 2}`,
    sports: i % 2 ? ['running'] : [],
    isToday: i === 6,
  }));
  const route = Array.from({ length: 20 }, (_, i) => ({
    lat: 45.5 + Math.sin(i / 3) * 0.01,
    lon: -73.6 + i * 0.002,
    value: i * 5,
    distance: i * 300,
  }));
  const series = Array.from({ length: 12 }, (_, i) => ({
    date: `${i + 1}`,
    value: i === 5 ? null : 35 + Math.sin(i / 2) * 10,
    minutes: 40 + i * 4,
    walking: 20 + i,
    running: i * 3,
    x: i,
    y: i * 2 + Math.sin(i) * 2,
  }));
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 text-text md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Development gallery
          </p>
          <h1 className="text-3xl font-bold">Components</h1>
        </div>
        <SegmentedControl
          label="Theme"
          value={theme.theme}
          onChange={theme.setTheme}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
            { value: 'system', label: 'System' },
          ]}
        />
      </header>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Pip</h2>
        <div className="flex flex-wrap items-end gap-5">
          {(
            ['wave', 'cheer', 'proud', 'thinking', 'sleepy', 'calm', 'oops', 'stretch'] as Pose[]
          ).map((pose) => (
            <div key={pose} className="flex flex-col items-center gap-1">
              <Pip pose={pose} size={72} />
              <span className="text-xs text-text-2">{pose}</span>
            </div>
          ))}
        </div>
        <CompanionMessage
          message={{
            id: 'gallery',
            text: 'You have been moving consistently this week.',
            pose: 'wave',
            data_refs: [],
          }}
        />
        <Button onClick={() => setCelebrate(true)}>Show celebration</Button>
        <Celebration
          open={celebrate}
          onClose={() => setCelebrate(false)}
          title="A new milestone"
          text="You reached 50 km in total. That is a lot of time spent moving."
        />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Controls and states</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">Primary action</Button>
          <Button>Secondary action</Button>
          <Button variant="quiet">Quiet action</Button>
          <Button variant="danger">Delete</Button>
          <Button disabled>Disabled</Button>
          <Button onClick={() => setDialog(true)}>Open dialog</Button>
          <GalleryToastButton />
          <Avatar name="Alex Runner" />
          <Kbd>⌘ K</Kbd>
          <Explainer
            title="Effort points"
            what="Minutes in each heart rate zone, with harder zones counting more."
            why="They help you compare sessions."
            source="Calculated from Garmin heart rate zones"
            method="effort_points"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Pill>Neutral</Pill>
          <Pill tone="accent">Accent</Pill>
          <Pill tone="success">Success</Pill>
          <Pill tone="warning">Warning</Pill>
          <SourceBadge source="garmin" />
          <SourceBadge source="calculated" />
          <SourceBadge source="user" />
          <SourceBadge source="demo" />
          <SegmentedControl
            label="Range"
            value={range}
            onChange={setRange}
            options={['7D', '4W', '3M', '1Y'].map((v) => ({ value: v, label: v }))}
          />
          <Select
            value={selected}
            onChange={setSelected}
            label="Select sample"
            options={[
              { value: 'a', label: 'Option A' },
              { value: 'b', label: 'Option B' },
            ]}
          />
        </div>
        <Switch label="Notifications" checked={enabled} onChange={setEnabled} />
        <Tabs
          value={tab}
          onChange={setTab}
          label="Sample tabs"
          tabs={[
            { value: 'one', label: 'Overview' },
            { value: 'two', label: 'Details' },
          ]}
        />
        <Disclosure id="gallery">More detailed content appears on demand.</Disclosure>
        <Dialog
          open={dialog}
          onOpenChange={setDialog}
          title="Sample dialog"
          description="This is a review state."
        >
          <Button onClick={() => setDialog(false)}>Done</Button>
        </Dialog>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Numbers and progress</h2>
        <StatGrid>
          <StatTile label="Distance" value={42.2} unit="km" delta={{ value: 12, good: 'up' }} />
          <StatTile
            label="Resting HR"
            value={52}
            unit="bpm"
            delta={{ value: -3, unit: ' bpm', good: 'down' }}
          />
          <StatTile label="Missing" value={null} />
          <StatTile label="Sessions" value={0} />
        </StatGrid>
        <div className="flex flex-wrap items-end gap-5">
          <BigNumber value={72} size="hero" />
          <BigNumber value={72} size="xl" />
          <BigNumber value={72} size="lg" />
          <BigNumber value={72} size="md" />
          <DeltaChip value={3} good="neutral" />
        </div>
        <MetricRow label="Average pace" value="5:00" unit="/km" />
        <ProgressBar label="Weekly goal" value={75} />
        <ProgressBar label="Exceeded goal" value={120} />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Gauges and compact charts</h2>
        <div className="flex flex-wrap items-center gap-6">
          <RingGauge label="Body Battery" value={72} max={100} sublabel="Body Battery" />
          <RingGauge label="Weekly goal" value={120} max={100} size={160} color="success" />
          <RingGauge label="Missing" value={null} max={100} size={64} />
          <Sparkline values={[2, 3, null, 5, 4, 6]} />
        </div>
        <SegmentGauge
          label="Training effect"
          value={3.2}
          segments={[
            'Recovery',
            'Maintaining',
            'Improving',
            'Highly improving',
            'Overreaching',
          ].map((label, i) => ({ label, color: `z${i + 1}` }))}
        />
        <WeekDots days={days} />
        <ZoneBars minutes={[20, 15, 8, 4, 2]} />
        <StageBar
          stages={[
            { key: 'deep', label: 'Deep', minutes: 90, color: 'sleep-deep' },
            { key: 'light', label: 'Light', minutes: 230, color: 'sleep-light' },
            { key: 'rem', label: 'REM', minutes: 100, color: 'sleep-rem' },
          ]}
        />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Trend line" source="garmin">
          <BandLineChart label="HRV trend" data={series} band={[30, 45]} />
        </Card>
        <Card title="Weekly minutes" source="calculated">
          <BarSeries
            label="Minutes per week"
            data={series}
            series={[{ key: 'minutes', label: 'Minutes', color: 'accent' }]}
            goal={60}
            xKey="date"
          />
        </Card>
        <Card title="Stress mix">
          <StackedBars
            label="Stress levels"
            rows={[
              { label: 'Monday', values: { rest: 2, low: 5, high: 1 } },
              { label: 'Tuesday', values: { rest: 4, low: 3, high: 2 } },
            ]}
            series={[
              { key: 'rest', label: 'Rest', color: 'stress-rest' },
              { key: 'low', label: 'Low', color: 'stress-low' },
              { key: 'high', label: 'High', color: 'stress-high' },
            ]}
          />
        </Card>
        <Card title="Activity calendar">
          <CalendarHeatmap
            days={Array.from({ length: 84 }, (_, i) => ({
              date: new Date(Date.UTC(2026, 10, 8) - (83 - i) * 86400000)
                .toISOString()
                .slice(0, 10),
              minutes: i % 3 ? i * 2 : 0,
            }))}
          />
        </Card>
        <Card title="Relationship">
          <ScatterPlot
            label="Sleep and recovery"
            data={series.map((item) => ({ x: item.x, y: item.y }))}
            trend={{ slope: 2, intercept: 0 }}
          />
        </Card>
        <Card title="Activity streams">
          <StreamCharts
            streams={{ hr: [100, 120, 140, 130], speed: [2, 3, 4, 3], elevation: [1, 2, 3, 2] }}
          />
        </Card>
        <Card title="Route">
          <RouteMap points={route} />
        </Card>
        <Card title="No route">
          <RouteMap points={route.slice(0, 1)} />
        </Card>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <EmptyState
          title="Nothing here yet"
          text="Your next activity will appear here."
          action={<Button>Get started</Button>}
        />
        <ErrorState message="The server did not respond." retry={() => {}} />
        <Skeleton className="h-40" />
      </section>
    </div>
  );
}
