import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { guideTopicIds, guideTopics } from '../../content/guide';
import { MetricDrawerContext } from '../../features/metric-drawer/metric-drawer-context';
import GuidePage from './GuidePage';

const mocks = vi.hoisted(() => ({ methods: vi.fn(), research: vi.fn() }));
vi.mock('../../lib/queries', () => ({
  useMethods: () => mocks.methods(),
  useResearch: () => mocks.research(),
}));
vi.mock('../../layout/PageHeader', () => ({
  PageHeader: () => <h1>Guide</h1>,
}));

const method = {
  id: 'effort_points',
  version: 1,
  title: 'Effort points',
  plain: 'Heart rate weighted time.',
  formula: 'zone minutes × weight',
  inputs: ['heart rate samples'],
  minimum_data: 'One activity',
};
const paper = {
  id: 'paper-one',
  title: 'Sleep and endurance',
  authors: 'A Author',
  year: 2024,
  journal: 'Journal',
  doi: '10.1/test',
  pmcid: null,
  pubmed_url: null,
  publisher_url: 'https://example.test',
  full_text_status: 'downloaded',
  review_status: 'reviewed',
  topics: ['sleep'],
};

function renderAt(path: string, openMetric = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MetricDrawerContext.Provider value={openMetric}>
        <Routes>
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/guide/:topic" element={<GuidePage />} />
        </Routes>
      </MetricDrawerContext.Provider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test.each(guideTopicIds)('%s topic renders its content', (topic) => {
  mocks.methods.mockReturnValue({ data: [method], isPending: false, isError: false });
  mocks.research.mockReturnValue({
    data: { papers: [paper], reviews: [], claims: [] },
    isPending: false,
    isError: false,
  });
  renderAt(`/guide/${topic}`);
  expect(screen.getByRole('heading', { name: guideTopics[topic].title, level: 2 })).toBeTruthy();
  expect(screen.getByText(guideTopics[topic].summary)).toBeTruthy();
  expect(screen.getByText(/not affiliated with Garmin/)).toBeTruthy();
});

test('glossary entry opens its metric drawer', () => {
  const openMetric = vi.fn();
  renderAt('/guide/metrics', openMetric);
  fireEvent.click(screen.getByRole('button', { name: /Resting heart rate/ }));
  expect(openMetric).toHaveBeenCalledWith('resting_hr');
});

test('method hash scrolls to the matching calculation', async () => {
  const scroll = vi.fn();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  Element.prototype.scrollIntoView = scroll;
  mocks.methods.mockReturnValue({ data: [method], isPending: false, isError: false });
  renderAt('/guide/methods#effort_points@1');
  expect(document.getElementById('effort_points@1')).toBeTruthy();
  await waitFor(() => expect(scroll).toHaveBeenCalled());
});

test('research search filters papers', () => {
  mocks.research.mockReturnValue({
    data: {
      papers: [paper],
      reviews: [
        {
          paper_id: 'paper-one',
          population: 'Adults',
          finding: 'A measured effect',
          limitations: 'Small sample',
          approved_use: 'Context only',
        },
      ],
      claims: [],
    },
    isPending: false,
    isError: false,
  });
  renderAt('/guide/research');
  expect(screen.getByText('Sleep and endurance')).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search research papers' }), {
    target: { value: 'unrelated' },
  });
  expect(screen.queryByText('Sleep and endurance')).toBeNull();
});
