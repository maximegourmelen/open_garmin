import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
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
} from './index';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

afterEach(() => cleanup());

test('buttons expose variants, disabled state, and names', () => {
  render(
    <>
      <Button variant="primary" disabled>
        Save
      </Button>
      <IconButton label="Refresh">↻</IconButton>
      <Kbd>⌘ K</Kbd>
    </>,
  );
  expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy();
  expect(screen.getByText('⌘ K')).toBeTruthy();
});

test('panels and sections label their content and show source', () => {
  render(
    <Section heading="Last night" footnote="Source: Garmin">
      <Panel title="Sleep" action={<Button>Details</Button>}>
        7 h
      </Panel>
    </Section>,
  );
  expect(screen.getByRole('region', { name: 'Last night' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Sleep' })).toBeTruthy();
  expect(screen.getByText('Source: Garmin')).toBeTruthy();
});

test('tags, banner, and callout remain readable and dismissible', () => {
  const dismiss = vi.fn();
  render(
    <>
      <Tag>New record</Tag>
      <Banner>Demo workspace</Banner>
      <Callout onDismiss={dismiss}>About the data</Callout>
    </>,
  );
  expect(screen.getByText('New record')).toBeTruthy();
  expect(screen.getByRole('status').textContent).toContain('Demo workspace');
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss hint' }));
  expect(dismiss).toHaveBeenCalledOnce();
});

test('range control exposes pressed state and updates URL', () => {
  const change = vi.fn();
  render(<RangeControl value="30D" onChange={change} />);
  expect(screen.getByRole('button', { name: '30D' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '90D' }));
  expect(change).toHaveBeenCalledWith('90D');
  expect(window.location.search).toContain('range=90D');
});

test('data table sorts numeric columns and opens rows by keyboard', () => {
  const open = vi.fn();
  render(
    <DataTable
      caption="Activities"
      rows={[
        { id: 'a', n: 3 },
        { id: 'b', n: 1 },
      ]}
      keyFor={(row) => row.id}
      onRowClick={open}
      columns={[
        {
          key: 'n',
          label: 'Minutes',
          numeric: true,
          value: (row) => row.n,
          sortValue: (row) => row.n,
        },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Minutes' }));
  expect(screen.getAllByRole('row')[1].textContent).toBe('1');
  fireEvent.keyDown(screen.getAllByRole('row')[1], { key: 'Enter' });
  expect(open).toHaveBeenCalledWith({ id: 'b', n: 1 });
});

test('inputs and slider have accessible labels and values', () => {
  const change = vi.fn();
  render(
    <>
      <Input label="Name" defaultValue="Alex" />
      <NumberInput label="Goal" defaultValue={150} />
      <Slider label="Effort" value={30} onChange={change} />
    </>,
  );
  expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('Alex');
  expect((screen.getByRole('spinbutton', { name: 'Goal' }) as HTMLInputElement).value).toBe('150');
  expect(screen.getByRole('slider', { name: 'Effort' })).toBeTruthy();
});

test('select, combobox, switch, and tabs expose controls', () => {
  const select = vi.fn();
  const combo = vi.fn();
  const toggle = vi.fn();
  const tab = vi.fn();
  render(
    <>
      <Select
        label="Units"
        value="metric"
        onChange={select}
        options={[
          { value: 'metric', label: 'Metric' },
          { value: 'imperial', label: 'Imperial' },
        ]}
      />
      <Combobox
        label="Timezone"
        value="toronto"
        onChange={combo}
        options={[
          { value: 'toronto', label: 'Toronto' },
          { value: 'paris', label: 'Paris' },
        ]}
      />
      <Switch label="Alerts" checked={false} onChange={toggle} />
      <Tabs
        label="Views"
        value="one"
        onChange={tab}
        tabs={[
          { value: 'one', label: 'Overview' },
          { value: 'two', label: 'Details' },
        ]}
      />
    </>,
  );
  expect(screen.getByRole('combobox', { name: 'Units' })).toBeTruthy();
  fireEvent.focus(screen.getByRole('combobox', { name: 'Timezone' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Timezone' }), {
    target: { value: 'Par' },
  });
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Timezone' }), { key: 'Enter' });
  expect(combo).toHaveBeenCalledWith('paris');
  expect(screen.getByRole('switch', { name: 'Alerts' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected')).toBe('true');
});

test('drawer and dialog are named and close on command', () => {
  const change = vi.fn();
  const view = render(
    <Drawer title="About sleep" open onOpenChange={change}>
      Details
    </Drawer>,
  );
  expect(screen.getByRole('dialog', { name: 'About sleep' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Close drawer' }));
  expect(change).toHaveBeenCalledWith(false);
  view.unmount();
  render(
    <Dialog title="Confirm" open onOpenChange={change}>
      Proceed?
    </Dialog>,
  );
  expect(screen.getByRole('dialog', { name: 'Confirm' })).toBeTruthy();
});

test('popover opens from an accessible trigger', () => {
  render(<Popover trigger={<button type="button">About</button>}>Explained</Popover>);
  fireEvent.click(screen.getByRole('button', { name: 'About' }));
  expect(screen.getByText('Explained')).toBeTruthy();
});

test('feedback states give a retry and lazy disclosure', () => {
  const retry = vi.fn();
  render(
    <>
      <EmptyState title="No activities" text="Connect Garmin to see your history." />
      <ErrorState message="Offline" retry={retry} />
      <Skeleton className="h-4" />
      <Disclosure id="new-kit">Advanced values</Disclosure>
    </>,
  );
  expect(screen.getByText('No activities')).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toContain("Couldn't load this section");
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledOnce();
  expect(screen.queryByText('Advanced values')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Show advanced metrics' }));
  expect(screen.getByText('Advanced values')).toBeTruthy();
});
