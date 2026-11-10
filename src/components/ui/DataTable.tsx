import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type TableColumn<Row> = {
  key: string;
  label: string;
  value: (row: Row) => ReactNode;
  sortValue?: (row: Row) => number | string;
  numeric?: boolean;
};

export function DataTable<Row>({
  columns,
  rows,
  keyFor,
  onRowClick,
  caption,
}: {
  columns: TableColumn<Row>[];
  rows: Row[];
  keyFor: (row: Row, index: number) => string;
  onRowClick?: (row: Row) => void;
  caption: string;
}) {
  const [sort, setSort] = useState<{ key: string; descending: boolean } | null>(null);
  const ordered = useMemo(() => {
    const column = columns.find((item) => item.key === sort?.key);
    if (!column?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const first = column.sortValue?.(a);
      const second = column.sortValue?.(b);
      const result =
        typeof first === 'number' && typeof second === 'number'
          ? first - second
          : String(first).localeCompare(String(second));
      return sort?.descending ? -result : result;
    });
  }, [columns, rows, sort]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse type-body text-text">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-bg">
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={
                  sort?.key === column.key ? (sort.descending ? 'descending' : 'ascending') : 'none'
                }
                className={cn(
                  'h-10 px-3 type-caption font-normal text-text-3',
                  column.numeric ? 'text-right' : 'text-left',
                )}
              >
                {column.sortValue ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSort((current) => ({
                        key: column.key,
                        descending: current?.key === column.key ? !current.descending : false,
                      }))
                    }
                  >
                    {column.label}
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordered.map((row, index) => (
            <tr
              key={keyFor(row, index)}
              className={cn(
                'h-11 border-b border-border hover:bg-surface-2',
                onRowClick && 'cursor-pointer',
              )}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(event) => {
                if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onRowClick(row);
                }
              }}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn('px-3', column.numeric && 'text-right tabular-nums')}
                >
                  {column.value(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
