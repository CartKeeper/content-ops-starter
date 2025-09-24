import type { SortingState, PaginationState, RowSelectionState } from '@tanstack/react-table';

export const isSamePagination = (a: PaginationState, b: PaginationState) =>
  a.pageIndex === b.pageIndex && a.pageSize === b.pageSize;

export const isSameSorting = (a: SortingState, b: SortingState) =>
  a.length === b.length && a.every((x, i) => x.id === b[i]?.id && x.desc === b[i]?.desc);

export const isSameRowSelection = (a: RowSelectionState, b: RowSelectionState) => {
  if (a === b) return true;
  const ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i++) { const k = ak[i]; if (a[k] !== b[k]) return false; }
  return true;
};
