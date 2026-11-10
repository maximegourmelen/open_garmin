import { useState } from 'react';
import { Info, Plus, RefreshCcw } from 'lucide-react';
import { useTheme } from './app/theme-context';
import {
  Bars,
  BulletChart,
  CalendarHeatmap,
  ClockScatter,
  RangeBars,
  RouteMap,
  SegmentScale,
  Sparkline,
  StageBar,
  StreamCharts,
  TrendLine,
  ZoneBars,
} from './components/charts';
import { Delta, Metric, MetricStrip, StatusDot } from './components/data';
import {
  Banner,
  Button,
  Callout,
  Combobox,
  DataTable,
  Dialog,
  Disclosure,
  Drawer,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  Kbd,
  NumberInput,
  Panel,
  Popover,
  RangeControl,
  Section,
  Select,
  Skeleton,
  Slider,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  useToast,
} from './components/ui';

const trend = Array.from({ length: 14 }, (_, index) => ({
  date: `Nov ${index + 1}`,
  value: index === 5 ? null : 46 + index * 0.35 + Math.sin(index * 1.7) * 3,
}));
const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((date, index) => ({
  date,
  value: [35, 43, 46, 0, 36, 55, 32][index],
  partial: false,
}));

function ToastExample() {
  const toast = useToast();
  return (
    <Button
      variant="secondary"
      onClick={() => toast({ message: 'Goal saved', action: { label: 'Undo', onClick: () => {} } })}
    >
      Show toast
    </Button>
  );
}

function MockOverview() {
  return (
    <div
      id="mock-overview"
      data-testid="mock-overview"
      className="space-y-12 border-b border-border pb-12"
    >
      <header className="border-b border-border pb-6">
        <p className="type-caption text-text-3">Overview mock · Demo data for 8 Nov 2026</p>
        <h2 className="mt-3 type-title text-text">Sunday, 8 November</h2>
        <p className="mt-2 max-w-2xl type-body text-text-2">
          You recorded 247 active minutes this week. Last night’s sleep was within your usual range.
        </p>
      </header>
      <Section heading="Last night" footnote="Source: Garmin">
        <MetricStrip>
          <Metric
            label="Sleep"
            value="7 h 15 min"
            onAbout={() => {}}
            status={{ text: 'Within your usual range' }}
          />
          <Metric
            label="Resting HR"
            value={60}
            unit="bpm"
            onAbout={() => {}}
            status={{ text: 'Within your usual range' }}
          />
          <Metric
            label="HRV"
            value={54}
            unit="ms"
            onAbout={() => {}}
            status={{ text: 'Within your usual range' }}
          />
          <Metric label="Body Battery" value={85} onAbout={() => {}} caption="At wake" />
        </MetricStrip>
      </Section>
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <Section
          heading="This week"
          footnote="Source: Garmin"
          className="flex flex-col lg:col-span-7"
        >
          <Panel className="flex-1">
            <p className="num-hero">
              247<span className="ml-1 text-[0.55em] font-normal text-text-2">active min</span>
            </p>
            <p className="mt-2 type-body text-text-2">
              of 150 min goal · 6 activities · 3 h 32 min activity time
            </p>
            <div className="mt-5">
              <Bars label="Daily active minutes" data={week} size="S" />
            </div>
          </Panel>
        </Section>
        <Section
          heading="Today"
          footnote="Calculated from your Garmin readings · How?"
          className="flex flex-col lg:col-span-5"
        >
          <Panel className="flex-1">
            <h3 className="type-heading">Easy day suggested</h3>
            <p className="mt-3 type-body text-text-2">
              You have already met your active minutes goal. A lighter day fits your recent activity
              and sleep.
            </p>
            <div className="mt-6 space-y-3 border-t border-border pt-5">
              <StatusDot text="Sleep within your usual range" />
              <br />
              <StatusDot text="Weekly goal met" tone="positive" />
            </div>
          </Panel>
        </Section>
      </div>
      <Section
        heading="Recent activity"
        action={<Button variant="ghost">View all activities</Button>}
        footnote="Source: Garmin"
      >
        <DataTable
          caption="Recent activities"
          keyFor={(row) => row.date}
          rows={[
            { date: '8 Nov', activity: 'Strength workout', time: '32:00', distance: '—' },
            { date: '7 Nov', activity: 'Easy run', time: '40:00', distance: '6.0 km' },
            { date: '6 Nov', activity: 'Park walk', time: '34:00', distance: '2.8 km' },
          ]}
          columns={[
            {
              key: 'date',
              label: 'Date',
              value: (row) => <span className="whitespace-nowrap">{row.date}</span>,
            },
            { key: 'activity', label: 'Activity', value: (row) => row.activity },
            { key: 'time', label: 'Activity time', value: (row) => row.time, numeric: true },
            { key: 'distance', label: 'Distance', value: (row) => row.distance, numeric: true },
          ]}
        />
      </Section>
    </div>
  );
}

export default function GalleryPage() {
  const theme = useTheme();
  const [range, setRange] = useState('30D');
  const [tab, setTab] = useState('overview');
  const [units, setUnits] = useState('metric');
  const [timezone, setTimezone] = useState('toronto');
  const [switchOn, setSwitchOn] = useState(true);
  const [slider, setSlider] = useState(40);
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [callout, setCallout] = useState(true);
  return (
    <div className="mx-auto max-w-[1120px] space-y-12 px-4 pb-20 pt-8 text-text md:px-10 md:pt-12">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="type-caption text-text-3">Design review · Redesign v2</p>
          <h1 className="mt-2 type-title">Component gallery</h1>
          <p className="mt-2 max-w-xl type-body text-text-2">
            A review of the visual system, interaction states, charts, and an Overview mock.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={theme.resolved === 'light' ? 'primary' : 'secondary'}
            onClick={() => theme.setTheme('light')}
          >
            Light
          </Button>
          <Button
            variant={theme.resolved === 'dark' ? 'primary' : 'secondary'}
            onClick={() => theme.setTheme('dark')}
          >
            Dark
          </Button>
        </div>
      </header>

      <MockOverview />

      <Section
        heading="Typography and colors"
        description="One typeface, restrained color, and tabular numbers."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Panel title="Type scale">
            <div className="space-y-4">
              <p className="num-hero">
                182<span className="ml-1 text-[0.55em] font-normal text-text-2">min</span>
              </p>
              <p className="num-xl">7 h 15 min</p>
              <p className="type-title">Page title</p>
              <p className="type-heading">Section heading</p>
              <p className="type-body">Body text explains the data in one clear sentence.</p>
              <p className="type-label text-text-2">Metric label</p>
              <p className="type-caption text-text-3">Source: Garmin</p>
            </div>
          </Panel>
          <Panel title="Palette">
            <div className="grid grid-cols-2 gap-3">
              {[
                'bg',
                'surface',
                'surface-2',
                'text',
                'text-2',
                'text-3',
                'accent',
                'positive',
                'caution',
                'negative',
              ].map((token) => (
                <div key={token} className="flex items-center gap-2 type-caption">
                  <span
                    className="size-5 rounded-sm border border-border"
                    style={{ background: `var(--${token})` }}
                  />
                  {token}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </Section>

      <Section heading="Actions and navigation">
        <Panel title="Buttons and states">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button>Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button size="sm">Small</Button>
            <Button disabled>Disabled</Button>
            <IconButton label="Refresh">
              <RefreshCcw size={16} />
            </IconButton>
            <Tooltip
              trigger={
                <button type="button" className="type-body text-text-2 underline">
                  Help tooltip
                </button>
              }
            >
              Additional detail
            </Tooltip>
            <Kbd>⌘ K</Kbd>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <RangeControl value={range} onChange={setRange} includeAll />
            <Tabs
              label="Example tabs"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'overview', label: 'Overview' },
                { value: 'details', label: 'Details' },
              ]}
            />
          </div>
        </Panel>
      </Section>

      <Section heading="Forms and choices">
        <Panel>
          <div className="grid gap-6 md:grid-cols-3">
            <Input label="Activity name" placeholder="Enter a name" />
            <NumberInput label="Weekly goal" defaultValue={150} />
            <Select
              label="Units"
              value={units}
              onChange={setUnits}
              options={[
                { value: 'metric', label: 'Metric' },
                { value: 'imperial', label: 'Imperial' },
              ]}
            />
            <Combobox
              label="Timezone"
              value={timezone}
              onChange={setTimezone}
              options={[
                { value: 'toronto', label: 'Toronto' },
                { value: 'paris', label: 'Paris' },
                { value: 'london', label: 'London' },
              ]}
            />
            <Switch label="Notifications" checked={switchOn} onChange={setSwitchOn} />
            <Slider label="Effort" value={slider} onChange={setSlider} />
          </div>
        </Panel>
      </Section>

      <Section heading="Data and status">
        <div className="space-y-6">
          <MetricStrip>
            <Metric
              label="Active minutes"
              value={182}
              unit="min"
              onAbout={() => setDrawer(true)}
              delta={{ value: 32, unit: 'min', good: 'up' }}
            />
            <Metric
              label="Resting HR"
              value={59}
              unit="bpm"
              onAbout={() => setDrawer(true)}
              delta={{ value: -3, unit: 'bpm', good: 'down' }}
            />
            <Metric label="HRV" value={null} unit="ms" onAbout={() => setDrawer(true)} />
            <Metric
              label="Body Battery"
              value={78}
              onAbout={() => setDrawer(true)}
              status={{ text: 'Within your usual range' }}
            />
          </MetricStrip>
          <Panel>
            <div className="flex flex-wrap items-center gap-6">
              <Delta value={4} unit="bpm" good="down" />
              <Delta value={-4} unit="bpm" good="down" />
              <Delta value={0} unit="bpm" good="down" />
              <StatusDot text="Within your usual range" />
              <StatusDot text="Above usual" tone="caution" />
              <StatusDot text="Better than usual" tone="positive" />
              <Tag>New record</Tag>
              <Tag>Estimate</Tag>
            </div>
          </Panel>
        </div>
      </Section>

      <Section
        heading="Charts"
        description="Straight lines, real gaps, and tables for every larger chart."
      >
        <div className="grid items-stretch gap-6 md:grid-cols-2">
          <Panel title="Trend">
            <TrendLine label="HRV" data={trend} band={[45, 53]} reading="Within your usual range" />
          </Panel>
          <Panel title="Active minutes">
            <Bars label="Active minutes" data={week} goal={150} />
          </Panel>
          <Panel title="Body Battery range">
            <RangeBars
              label="Body Battery"
              data={[
                { date: 'Mon', low: 24, high: 84 },
                { date: 'Tue', low: 18, high: 76 },
                { date: 'Wed', low: 30, high: 88 },
                { date: 'Thu', low: 19, high: 79 },
              ]}
            />
          </Panel>
          <Panel title="Bedtime">
            <ClockScatter
              label="Bedtime"
              data={[
                { date: 'Mon', minutes_from_noon: 650 },
                { date: 'Tue', minutes_from_noon: 680 },
                { date: 'Wed', minutes_from_noon: null },
                { date: 'Thu', minutes_from_noon: 645 },
              ]}
              usual={[620, 690]}
            />
          </Panel>
          <Panel title="Load">
            <BulletChart label="This week" value={120} goal={150} max={250} range={[80, 180]} />
          </Panel>
          <Panel title="Compact data">
            <div className="space-y-5">
              <Sparkline values={[42, 44, null, 46, 45, 51]} />
              <StageBar
                stages={[
                  { key: 'deep', label: 'Deep', minutes: 95, color: 'sleep-deep' },
                  { key: 'light', label: 'Light', minutes: 250, color: 'sleep-light' },
                  { key: 'rem', label: 'REM', minutes: 90, color: 'sleep-rem' },
                ]}
              />
              <ZoneBars minutes={[20, 15, 8, 4, 2]} />
              <SegmentScale
                label="Training effect"
                value={2.8}
                segments={[1, 2, 3, 4, 5].map((n) => ({ label: `${n}`, color: `z${n}` }))}
              />
            </div>
          </Panel>
          <Panel title="Calendar heatmap">
            <CalendarHeatmap
              days={Array.from({ length: 84 }, (_, index) => ({
                date: new Date(Date.UTC(2026, 8, index + 1)).toISOString().slice(0, 10),
                minutes: index % 5 ? (index % 4) * 20 : 0,
              }))}
            />
          </Panel>
          <Panel title="Activity route">
            <RouteMap
              points={[
                { lat: 45.5, lon: -73.6 },
                { lat: 45.51, lon: -73.605 },
                { lat: 45.52, lon: -73.61 },
              ]}
            />
          </Panel>
          <Panel title="Activity streams">
            <StreamCharts
              streams={{ hr: [110, 125, 135, 128, 140], speed: [2.5, 2.7, null, 2.8, 2.9] }}
            />
          </Panel>
        </div>
      </Section>

      <Section heading="Feedback and overlays">
        <div className="space-y-6">
          <Banner
            action={
              <Button size="sm" variant="ghost">
                Details
              </Button>
            }
          >
            Demo workspace · Changes are not saved.
          </Banner>
          {callout && (
            <Callout onDismiss={() => setCallout(false)}>
              This reading uses your last 30 days of data.
            </Callout>
          )}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setDialog(true)}>Open dialog</Button>
            <Button onClick={() => setDrawer(true)}>Open drawer</Button>
            <Popover
              trigger={
                <Button variant="ghost">
                  <Info size={16} /> About this page
                </Button>
              }
            >
              These values come from Garmin and calculations in this app.
            </Popover>
            <ToastExample />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <EmptyState
              title="No activities yet"
              text="Connect Garmin to see your activities here."
              action={
                <Button variant="secondary">
                  <Plus size={16} /> Connect Garmin
                </Button>
              }
            />
            <ErrorState message="Network request timed out" retry={() => {}} />
            <Panel title="Loading">
              <div className="space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-5 w-full" />
              </div>
            </Panel>
          </div>
          <Disclosure id="gallery-advanced">
            Additional metrics appear here when expanded.
          </Disclosure>
        </div>
      </Section>

      <Dialog
        open={dialog}
        onOpenChange={setDialog}
        title="Delete note"
        description="This will remove the note from this activity."
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setDialog(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => setDialog(false)}>
            Delete
          </Button>
        </div>
      </Dialog>
      <Drawer open={drawer} onOpenChange={setDrawer} title="About resting HR">
        <p className="type-body text-text-2">
          Resting heart rate is your heart rate when you are at rest. This value comes from Garmin.
        </p>
      </Drawer>
    </div>
  );
}
