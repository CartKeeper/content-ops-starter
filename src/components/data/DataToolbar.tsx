import * as React from 'react';
import Link from 'next/link';

type ToolbarFilterOption = {
    value: string;
    label: string;
    description?: string;
};

export type ToolbarFilter = {
    id: string;
    label: string;
    options: ToolbarFilterOption[];
    value: string[];
    onChange: (value: string[]) => void;
};

export type SortOption = {
    id: string;
    label: string;
};

export type ViewToggleOption = {
    id: string;
    label: string;
    href: string;
    active: boolean;
};

type PrimaryAction = {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
};

type DataToolbarProps = {
    searchValue: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    filters?: ToolbarFilter[];
    onResetFilters?: () => void;
    hasActiveFilters?: boolean;
    sortOptions: SortOption[];
    sortValue: string;
    onSortChange: (value: string) => void;
    viewOptions?: ViewToggleOption[];
    primaryAction?: PrimaryAction;
    selectedCount?: number;
    bulkActions?: React.ReactNode;
    pageSize?: number;
    onPageSizeChange?: (value: number) => void;
    pageSizeOptions?: number[];
};

export function DataToolbar({
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Search…',
    filters = [],
    onResetFilters,
    hasActiveFilters = false,
    sortOptions,
    sortValue,
    onSortChange,
    viewOptions,
    primaryAction,
    selectedCount = 0,
    bulkActions,
    pageSize,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100]
}: DataToolbarProps) {
    const [localSearch, setLocalSearch] = React.useState(searchValue);

    React.useEffect(() => {
        setLocalSearch(searchValue);
    }, [searchValue]);

    React.useEffect(() => {
        const timeout = window.setTimeout(() => {
            if (localSearch !== searchValue) {
                onSearchChange(localSearch);
            }
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [localSearch, onSearchChange, searchValue]);

    return (
        <div className="flex flex-col gap-4 rounded-2xl bg-slate-900/60 p-4 backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 items-center gap-3">
                    <div className="relative flex-1">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="h-4 w-4"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M9 3.5a5.5 5.5 0 1 0 3.473 9.8l3.613 3.614a.75.75 0 1 0 1.06-1.061l-3.613-3.613A5.5 5.5 0 0 0 9 3.5Zm-4 5.5a4 4 0 1 1 8 0a4 4 0 0 1-8 0Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </span>
                        <input
                            type="search"
                            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                            placeholder={searchPlaceholder}
                            value={localSearch}
                            onChange={(event) => setLocalSearch(event.target.value)}
                            aria-label="Search"
                        />
                    </div>
                    {viewOptions && viewOptions.length > 0 ? (
                        <nav aria-label="Views" className="hidden overflow-hidden rounded-full bg-slate-800/80 p-1 text-xs font-medium text-slate-400 shadow-inner md:flex">
                            {viewOptions.map((option) => (
                                <Link
                                    key={option.id}
                                    href={option.href}
                                    className={`flex-1 rounded-full px-4 py-1.5 text-center transition ${
                                        option.active
                                            ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white shadow'
                                            : 'hover:text-slate-100'
                                    }`}
                                >
                                    {option.label}
                                </Link>
                            ))}
                        </nav>
                    ) : null}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <label htmlFor="sort" className="hidden md:block">
                            Sort by
                        </label>
                        <select
                            id="sort"
                            className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                            value={sortValue}
                            onChange={(event) => onSortChange(event.target.value)}
                        >
                            {sortOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {primaryAction ? (
                        primaryAction.href ? (
                            <Link
                                href={primaryAction.href}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-400 hover:via-purple-500 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                                {primaryAction.icon}
                                {primaryAction.label}
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={primaryAction.onClick}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-400 hover:via-purple-500 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                                {primaryAction.icon}
                                {primaryAction.label}
                            </button>
                        )
                    ) : null}
                </div>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {filters.map((filter) => (
                        <FilterPopover key={filter.id} filter={filter} />
                    ))}
                    {hasActiveFilters && onResetFilters ? (
                        <button
                            type="button"
                            className="rounded-full border border-transparent bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-800"
                            onClick={onResetFilters}
                        >
                            Clear filters
                        </button>
                    ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                    {typeof pageSize === 'number' && onPageSizeChange ? (
                        <label className="flex items-center gap-2 text-xs text-slate-400">
                            Show
                            <select
                                className="rounded-xl border border-slate-700 bg-slate-900/80 px-2 py-1 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                                value={pageSize}
                                onChange={(event) => onPageSizeChange(Number.parseInt(event.target.value, 10))}
                            >
                                {pageSizeOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                            rows
                        </label>
                    ) : null}
                    {selectedCount > 0 ? (
                        <div className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
                            {selectedCount} selected
                        </div>
                    ) : null}
                    {bulkActions}
                </div>
            </div>
        </div>
    );
}

function FilterPopover({ filter }: { filter: ToolbarFilter }) {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (!open) {
            return;
        }

        function handleClick(event: MouseEvent) {
            if (!containerRef.current) {
                return;
            }
            if (!containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const activeCount = filter.value.length;

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    activeCount
                        ? 'border-indigo-400/60 bg-indigo-500/10 text-indigo-200'
                        : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-600'
                }`}
                onClick={() => setOpen((previous) => !previous)}
                aria-haspopup="menu"
                aria-expanded={open}
            >
                {filter.label}
                {activeCount ? <span className="rounded-full bg-indigo-500/40 px-1.5 py-0.5 text-[10px] text-white">{activeCount}</span> : null}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3 w-3"
                >
                    <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
                </svg>
            </button>
            {open ? (
                <div
                    role="menu"
                    className="absolute right-0 z-20 mt-2 w-60 rounded-2xl border border-slate-700 bg-slate-900/95 p-4 text-sm text-slate-100 shadow-2xl"
                >
                    <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                        <span>{filter.label}</span>
                        <button
                            type="button"
                            className="text-[11px] font-medium text-indigo-300 hover:text-indigo-200"
                            onClick={() => filter.onChange([])}
                        >
                            Clear
                        </button>
                    </div>
                    <div className="flex flex-col gap-2">
                        {filter.options.map((option) => {
                            const checked = filter.value.includes(option.value);
                            return (
                                <label key={option.value} className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-slate-800/70">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                            const next = new Set(filter.value);
                                            if (checked) {
                                                next.delete(option.value);
                                            } else {
                                                next.add(option.value);
                                            }
                                            filter.onChange(Array.from(next));
                                        }}
                                        className="mt-1 h-3.5 w-3.5 rounded border border-slate-600 bg-slate-900 text-indigo-400 focus:ring-1 focus:ring-indigo-400"
                                    />
                                    <span className="flex-1 text-sm text-slate-100">
                                        <span className="block font-medium">{option.label}</span>
                                        {option.description ? (
                                            <span className="mt-0.5 block text-xs text-slate-400">{option.description}</span>
                                        ) : null}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default DataToolbar;

