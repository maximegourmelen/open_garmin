import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BigNumber, DeltaChip } from '../data';
import { RingGauge, RouteMap, Sparkline, StreamCharts, ZoneBars } from './index';

describe('data displays', () => {
  it('distinguishes missing values from zero', () => {
    render(
      <>
        <BigNumber value={null} />
        <BigNumber value={0} />
      </>,
    );
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('judges a decreasing delta according to its meaning', () => {
    const { container } = render(<DeltaChip value={-3} unit=" bpm" good="down" />);
    expect(container.querySelector('[aria-label="Down 3 bpm"]')?.className).toContain(
      'text-success',
    );
  });
});

describe('charts', () => {
  it('names the ring gauge value for assistive technology', () => {
    render(<RingGauge value={72} max={100} label="Body Battery" />);
    expect(screen.getByRole('img', { name: 'Body Battery: 72 of 100' })).toBeTruthy();
  });

  it('breaks a sparkline at null data', () => {
    const { container } = render(<Sparkline values={[1, 2, null, 3, 4]} />);
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });

  it('orders heart rate zones from Z5 to Z1', () => {
    render(<ZoneBars minutes={[1, 2, 3, 4, 5]} />);
    expect(screen.getByLabelText('Heart rate zones').textContent).toMatch(/^Z5.*Z4.*Z3.*Z2.*Z1/);
  });

  it('requires two GPS points and draws one segment per pair', () => {
    const { rerender, container } = render(<RouteMap points={[{ lat: 45, lon: -73 }]} />);
    expect(screen.getByText('Route unavailable')).toBeTruthy();
    rerender(
      <RouteMap
        points={[
          { lat: 45, lon: -73 },
          { lat: 45.01, lon: -73.01 },
          { lat: 45.02, lon: -73.02 },
        ]}
      />,
    );
    expect(screen.getByRole('img', { name: 'Activity route' })).toBeTruthy();
    expect(container.querySelectorAll('svg[aria-label="Activity route"] path')).toHaveLength(3);
  });

  it('shows only streams that have samples', () => {
    render(<StreamCharts streams={{ hr: [100, 110], speed: [null, null], elevation: [1, 2] }} />);
    expect(screen.getAllByRole('img', { name: /over activity/ })).toHaveLength(2);
    expect(screen.queryByRole('img', { name: 'Speed over activity' })).toBeNull();
  });
});
