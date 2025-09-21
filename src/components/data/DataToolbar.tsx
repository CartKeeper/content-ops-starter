import * as React from 'react';
import Link from 'next/link';
import classNames from 'classnames';

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
        <div className="card card-stacked">
            <div className="card-body d-flex flex-column gap-3">
                <div className="row g-2 align-items-center">
                    <div className="col-md">
                        <div className="input-icon">
                            <span className="input-icon-addon">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="icon"
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
                                className="form-control"
                                placeholder={searchPlaceholder}
                                value={localSearch}
                                onChange={(event) => setLocalSearch(event.target.value)}
                                aria-label="Search"
                            />
                        </div>
                    </div>
                    {viewOptions && viewOptions.length > 0 ? (
                        <div className="col-auto">
                            <div className="btn-group btn-group-sm" role="group" aria-label="View options">
                                {viewOptions.map((option) => (
                                    <Link
                                        key={option.id}
                                        href={option.href}
                                        className={classNames('btn', option.active ? 'btn-primary' : 'btn-outline-secondary')}
                                    >
                                        {option.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    <div className="col-auto d-flex align-items-center gap-2">
                        <label htmlFor="sort" className="text-secondary small mb-0">
                            Sort by
                        </label>
                        <select
                            id="sort"
                            className="form-select form-select-sm"
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
                        <div className="col-auto">
                            {primaryAction.href ? (
                                <Link href={primaryAction.href} className="btn btn-primary d-inline-flex align-items-center gap-2">
                                    {primaryAction.icon}
                                    {primaryAction.label}
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={primaryAction.onClick}
                                    className="btn btn-primary d-inline-flex align-items-center gap-2"
                                >
                                    {primaryAction.icon}
                                    {primaryAction.label}
                                </button>
                            )}
                        </div>
                    ) : null}
                </div>

                {filters.length > 0 || (hasActiveFilters && onResetFilters) ? (
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        {filters.map((filter) => (
                            <ToolbarFilterChip key={filter.id} filter={filter} />
                        ))}
                        {hasActiveFilters && onResetFilters ? (
                            <button type="button" className="btn btn-link btn-sm text-secondary" onClick={onResetFilters}>
                                Clear filters
                            </button>
                        ) : null}
                    </div>
                ) : null}

                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div className="d-flex flex-wrap align-items-center gap-3">
                        {typeof pageSize === 'number' && onPageSizeChange ? (
                            <label className="d-flex align-items-center gap-2 text-secondary small mb-0">
                                Show
                                <select
                                    className="form-select form-select-sm"
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
                            <span className="badge bg-primary-lt text-primary text-uppercase fw-semibold">
                                {selectedCount} selected
                            </span>
                        ) : null}
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-2">{bulkActions}</div>
                </div>
            </div>
        </div>
    );
}

export function ToolbarFilterChip({ filter }: { filter: ToolbarFilter }) {
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
        <div className={classNames('dropdown', { show: open })} ref={containerRef}>
            <button
                type="button"
                className={classNames('btn btn-sm d-inline-flex align-items-center gap-2', activeCount ? 'btn-primary' : 'btn-outline-secondary')}
                onClick={() => setOpen((previous) => !previous)}
                aria-haspopup="menu"
                aria-expanded={open}
            >
                {filter.label}
                {activeCount ? <span className="badge bg-white text-primary">{activeCount}</span> : null}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="icon"
                    aria-hidden="true"
                >
                    <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
                </svg>
            </button>
            <div
                role="menu"
                className={classNames('dropdown-menu dropdown-menu-card dropdown-menu-end p-3', { show: open })}
            >
                <div className="d-flex align-items-center justify-content-between text-uppercase text-secondary small mb-2">
                    <span>{filter.label}</span>
                    <button type="button" className="btn btn-link btn-sm p-0" onClick={() => filter.onChange([])}>
                        Clear
                    </button>
                </div>
                <div className="d-flex flex-column gap-2">
                    {filter.options.map((option) => {
                        const checked = filter.value.includes(option.value);
                        return (
                            <label key={option.value} className="form-check d-flex align-items-start gap-2">
                                <input
                                    type="checkbox"
                                    className="form-check-input mt-1"
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
                                />
                                <span className="form-check-label">
                                    <span className="fw-semibold d-block">{option.label}</span>
                                    {option.description ? (
                                        <span className="text-secondary small d-block">{option.description}</span>
                                    ) : null}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default DataToolbar;

