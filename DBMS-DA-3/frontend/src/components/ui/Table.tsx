import React from 'react';
import clsx from 'clsx';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
  maxHeight?: string;
  scrollable?: boolean;
}

export const Table: React.FC<TableProps> = ({
  className,
  containerClassName,
  maxHeight = 'max-h-[530px]',
  scrollable = true,
  children,
  ...props
}) => (
  <div
    className={clsx(
      'w-full overflow-x-auto rounded-xl border border-obsidian-800 bg-obsidian-900/50 relative',
      scrollable && clsx('overflow-y-auto', maxHeight),
      containerClassName
    )}
  >
    <table className={clsx('w-full text-left text-sm border-collapse', className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <thead
    className={clsx(
      'sticky top-0 z-10 border-b border-obsidian-800 bg-obsidian-950 text-obsidian-400 font-mono text-xs uppercase tracking-wider shadow-sm',
      className
    )}
    {...props}
  >
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <tbody className={clsx('divide-y divide-obsidian-800/60', className)} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  children,
  ...props
}) => (
  <tr className={clsx('transition-colors duration-150 hover:bg-obsidian-800/50', className)} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <th className={clsx('px-5 py-3.5 font-medium whitespace-nowrap bg-obsidian-950', className)} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <td className={clsx('px-5 py-3.5 text-obsidian-200 whitespace-nowrap align-middle', className)} {...props}>
    {children}
  </td>
);

export const TableEmpty: React.FC<{ message?: string; colSpan?: number }> = ({
  message = 'No records found in this table.',
  colSpan = 5,
}) => (
  <tr>
    <td colSpan={colSpan} className="px-6 py-12 text-center text-obsidian-500 text-sm">
      <div className="flex flex-col items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-obsidian-700" />
        <p>{message}</p>
      </div>
    </td>
  </tr>
);
