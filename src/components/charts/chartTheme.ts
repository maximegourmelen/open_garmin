export const chartColor = (token: string) => `var(--${token})`;

export const chartTheme = {
  grid: chartColor('border'),
  text: chartColor('text-2'),
  tooltip: chartColor('surface-2'),
  accent: chartColor('accent'),
};

export function chartTooltipStyle(): React.CSSProperties {
  return {
    background: chartTheme.tooltip,
    border: `1px solid ${chartColor('border-strong')}`,
    borderRadius: 12,
    color: chartColor('text'),
  };
}
