import * as React from 'react';
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type OnChangeFn,
    type PaginationState,
    type RowSelectionState,
    type SortingState
} from '@tanstack/react-table';

type DataTableProps<TData> = {
    columns: ColumnDef<TData, any>[];
    data: TData[];
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
    pagination: PaginationState;
    onPaginationChange: OnChangeFn<PaginationState>;
    rowSelection: RowSelectionState;
    onRowSelectionChange: OnChangeFn<RowSelectionState>;
    getRowId?: (row: TData, index: number) => string;
    onRowClick?: (row: TData) => void;
    isLoading?: boolean;
    emptyMessage?: React.ReactNode;
};

export function DataTable<TData>({
    columns,
    data,
    sorting,
    onSortingChange,
    pagination,
    onPaginationChange,
    rowSelection,
    onRowSelectionChange,
    getRowId,
    onRowClick,
    isLoading = false,
    emptyMessage
}: DataTableProps<TData>) {
    const table = useReactTable({
        data,
        columns,
        state: { sorting, pagination, rowSelection },
        getRowId,
        onSortingChange,
        onPaginationChange,
        onRowSelectionChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        autoResetPageIndex: false
    });

    const { pageIndex, pageSize } = table.getState().pagination;

    const skeletonRows = React.useMemo(() => {
        return Array.from({ length: pageSize }).map((_, index) => (
            <tr key={`skeleton-${index}`} className="animate-pulse">
                {table.getAllLeafColumns().map((column) => (
                    <td key={column.id} className="h-12 border-b border-slate-800/60 px-4">
                        <div className="h-3 rounded bg-slate-700/50" />
                    </td>
                ))}
            </tr>
        ));
    }, [pageSize, table]);

    const rows = table.getRowModel().rows;

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/60 shadow-xl">
            <div className="max-h-[65vh] overflow-auto">
                <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-100">
                    <thead className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const canSort = header.column.getCanSort();
                                    const sortingState = header.column.getIsSorted();
                                    return (
                                        <th
                                            key={header.id}
                                            scope="col"
                                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                                        >
                                            {header.isPlaceholder ? null : canSort ? (
                                                <button
                                                    type="button"
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    className="flex items-center gap-1 text-slate-200 transition hover:text-white"
                                                >
                                                    <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                                                    {sortingState ? (
                                                        <span aria-hidden className="text-[10px]">
                                                            {sortingState === 'desc' ? '↓' : '↑'}
                                                        </span>
                                                    ) : null}
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-200">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </div>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {isLoading
                            ? skeletonRows
                            : rows.length === 0
                              ? (
                                    <tr>
                                        <td
                                            colSpan={columns.length}
                                            className="px-6 py-16 text-center text-sm text-slate-400"
                                        >
                                            {emptyMessage ?? 'No results found.'}
                                        </td>
                                    </tr>
                                )
                              : rows.map((row) => {
                                    const rowId = row.id;
                                    return (
                                        <tr
                                            key={rowId}
                                            className="group border-b border-slate-900/60 transition hover:bg-slate-900/60"
                                            onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <td key={cell.id} className="px-4 py-3 align-middle text-sm">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/80 px-4 py-3 text-xs text-slate-400">
                <div>
                    Page {pageIndex + 1} of {Math.max(1, table.getPageCount())}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition enabled:hover:border-indigo-400 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </button>
                    <button
                        type="button"
                        className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition enabled:hover:border-indigo-400 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DataTable;

