export type ChangelogEntry = {
  date: string;
  title: string;
  changes: readonly string[];
};

export const changelog: readonly ChangelogEntry[] = [
  {
    date: '2026-11-10',
    title: 'Clearer navigation',
    changes: [
      'Overview, Activities, Health and Trends are now the four main destinations.',
      'Search can open pages and activities, connect Garmin and change the theme.',
      'The sample workspace has one page-level notice that can be hidden for this session.',
    ],
  },
];
