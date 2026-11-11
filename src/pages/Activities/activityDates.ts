export const rangeDays = { '7D': 7, '30D': 30, '90D': 90, '1Y': 365 };

export function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
