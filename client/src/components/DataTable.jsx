import React from 'react';

/**
 * DataTable component
 * Sticky header, hairline row lines (#DAD6CB), no zebra stripes,
 * 40px rows, numbers right-aligned in tabular figures.
 */
export function DataTable({
  columns,
  data = [],
  onRowClick,
  emptyMessage,
  className = '',
  footerRow = null
}) {
  return (
    <div className={`w-full overflow-x-auto border border-hairline rounded-[6px] bg-surface ${className}`}>
      <table className="w-full text-left border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b border-hairline bg-paper/70 sticky top-0 z-10">
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                style={{ width: col.width }}
                className={`py-2 px-3 text-13 font-semibold text-muted select-none ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                } ${col.headerClassName || ''}`}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-15 text-muted bg-surface"
              >
                {emptyMessage || 'No records to display.'}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`h-[40px] transition-colors ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-paper/60 active:bg-hairline/20'
                    : ''
                }`}
              >
                {columns.map((col, colIdx) => {
                  const val = col.render ? col.render(row, rowIdx) : row[col.key];
                  return (
                    <td
                      key={col.key || colIdx}
                      className={`px-3 text-15 text-ink whitespace-nowrap ${
                        col.align === 'right'
                          ? 'text-right font-mono tabular-nums'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
        {footerRow && (
          <tfoot>
            <tr className="border-t-2 border-hairline bg-paper/60 font-semibold h-[40px]">
              {footerRow}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export default DataTable;

