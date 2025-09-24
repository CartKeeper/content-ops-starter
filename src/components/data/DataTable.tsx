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

import { cn } from '../../lib/cn';

const getNoopSortedRowModel = () => (table: any) => table.getPreSortedRowModel();
const getNoopPaginationRowModel = () => (table: any) => table.getPrePaginationRowModel();

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
    manualPagination?: boolean;
    manualSorting?: boolean;
    pageCount?: number;
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
    emptyMessage,
    manualPagination = false,
    manualSorting = false,
    pageCount
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
        getSortedRowModel: manualSorting ? getNoopSortedRowModel() : getSortedRowModel(),
        getPaginationRowModel: manualPagination ? getNoopPaginationRowModel() : getPaginationRowModel(),
        manualPagination,
        manualSorting,
        pageCount,
        autoResetAll: false,
        autoResetPageIndex: false,
        autoResetExpanded: false
    });

    const { pageIndex, pageSize } = table.getState().pagination;

    const skeletonRows = React.useMemo(() => {
        return Array.from({ length: pageSize }).map((_, index) => (
            <tr key={`skeleton-${index}`} className="placeholder-glow">
                {table.getAllLeafColumns().map((column) => (
                    <td key={column.id}>
                        <span className="placeholder col-6" style={{ minHeight: '0.75rem' }} />
                    </td>
                ))}
            </tr>
        ));
    }, [pageSize, table]);

    const rows = table.getRowModel().rows;

    return (
        <div className="card card-stacked">
            <div className="card-table table-responsive" style={{ maxHeight: '65vh' }}>
                <table className="table card-table table-vcenter">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const canSort = header.column.getCanSort();
                                    const sortingState = header.column.getIsSorted();
                                    return (
                                        <th key={header.id} scope="col" className="text-uppercase text-secondary small fw-semibold">
                                            {header.isPlaceholder
                                                ? null
                                                : canSort
                                                    ? (
                                                          <button
                                                              type="button"
                                                              className="btn btn-link p-0 text-reset d-inline-flex align-items-center gap-1"
                                                              onClick={header.column.getToggleSortingHandler()}
                                                          >
                                                              {flexRender(header.column.columnDef.header, header.getContext())}
                                                              {sortingState ? (
                                                                  <span aria-hidden className="text-secondary">
                                                                      {sortingState === 'desc' ? '↓' : '↑'}
                                                                  </span>
                                                              ) : null}
                                                          </button>
                                                      )
                                                    : (
                                                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
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
                                          <td colSpan={columns.length} className="text-center text-secondary py-5">
                                              {emptyMessage ?? 'No results found.'}
                                          </td>
                                      </tr>
                                  )
                                : rows.map((row) => {
                                      const rowId = row.id;
                                      return (
                                          <tr
                                              key={rowId}
                                              className={cn('align-middle', onRowClick ? 'cursor-pointer' : undefined)}
                                              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                                          >
                                              {row.getVisibleCells().map((cell) => (
                                                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                              ))}
                                          </tr>
                                      );
                                  })}
                    </tbody>
                </table>
            </div>
            <div className="card-footer d-flex flex-column flex-md-row gap-2 align-items-center justify-content-between text-secondary small">
                <div>
                    Page {pageIndex + 1} of {Math.max(1, table.getPageCount())}
                </div>
                <div className="d-flex align-items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
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

