import type { PaginationState, SortingState } from '@tanstack/react-table';

export function isSamePagination(a?: PaginationState, b?: PaginationState): boolean {
    if (a === b) {
        return true;
    }

    if (!a || !b) {
        return false;
    }

    return a.pageIndex === b.pageIndex && a.pageSize === b.pageSize;
}

export function isSameSorting(a?: SortingState, b?: SortingState): boolean {
    if (a === b) {
        return true;
    }

    if (!a || !b) {
        return false;
    }

    if (a.length !== b.length) {
        return false;
    }

    return a.every((entry, index) => {
        const other = b[index];
        return entry?.id === other?.id && entry?.desc === other?.desc;
    });
}
