export const chartColor = (token: string) => `var(--${token})`;

export const chartTheme = {
  grid: chartColor('border'),
  text: chartColor('text-2'),
  tooltip: chartColor('surface'),
  accent: chartColor('data-1'),
};

export function chartTooltipStyle(): React.CSSProperties {
  return {
    background: chartTheme.tooltip,
    border: `1px solid ${chartColor('border')}`,
    borderRadius: 8,
    color: chartColor('text'),
  };
}
