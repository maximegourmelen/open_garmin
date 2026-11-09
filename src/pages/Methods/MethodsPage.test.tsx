import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import MethodsPage from './MethodsPage';

const mocks = vi.hoisted(() => ({ methods: vi.fn(), research: vi.fn() }));
vi.mock('../../lib/queries', () => ({
  useMethods: () => mocks.methods(),
  useResearch: () => mocks.research(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
test('method details expand and research search and filters use reviewed records', () => {
  mocks.methods.mockReturnValue({
    data: [
      {
        id: 'active_minutes',
        version: 1,
        title: 'Active minutes',
        plain: 'How much you moved.',
        formula: 'moderate + 2 × vigorous',
        inputs: ['daily intensity'],
        minimum_data: 'One day',
      },
    ],
    isPending: false,
    isError: false,
  });
  mocks.research.mockReturnValue({
    data: {
      papers: [
        {
          id: 'one',
          title: 'Sleep in endurance training',
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
        },
        {
          id: 'two',
          title: 'Steps study',
          authors: 'B Author',
          year: 2023,
          journal: 'Journal',
          doi: '10.1/other',
          pmcid: null,
          pubmed_url: null,
          publisher_url: null,
          full_text_status: 'candidate',
          review_status: 'candidate',
          topics: ['steps'],
        },
      ],
      reviews: [
        {
          paper_id: 'one',
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
  render(<MethodsPage />);
  fireEvent.click(screen.getByRole('button', { name: /Active minutes/ }));
  expect(screen.getByText(/moderate \+ 2/)).toBeTruthy();
  expect(screen.getByText('Sleep in endurance training')).toBeTruthy();
  expect(screen.queryByText('Steps study')).toBeNull();
  fireEvent.change(screen.getByRole('combobox', { name: 'Research status' }), {
    target: { value: 'all' },
  });
  expect(screen.getByText('Steps study')).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search research papers' }), {
    target: { value: 'sleep' },
  });
  expect(screen.queryByText('Steps study')).toBeNull();
});
