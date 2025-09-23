import type { MouseEventHandler } from 'react';
import clsx from 'classnames';

import { Icon, type IconKey } from '../icons';
import type { DashboardViewMode } from './DashboardGrid';

const VIEW_LABELS: Record<DashboardViewMode, { label: string; icon: IconKey; description: string }> = {
    overview: {
        label: 'Overview',
        icon: 'stats',
        description: 'Studio health snapshot',
    },
    revenue: {
        label: 'Revenue',
        icon: 'dollar',
        description: 'Payments & pipeline',
    },
    client: {
        label: 'Client',
        icon: 'users',
        description: 'Relationships & delivery',
    },
};

export type DashboardViewToggleProps = {
    value: DashboardViewMode;
    views: readonly DashboardViewMode[];
    onChange: (next: DashboardViewMode) => void;
    className?: string;
};

export function DashboardViewToggle({ value, views, onChange, className }: DashboardViewToggleProps) {
    const handleSelect = (mode: DashboardViewMode): MouseEventHandler<HTMLButtonElement> => (event) => {
        event.preventDefault();
        if (mode === value) {
            onChange('overview');
            return;
        }
        onChange(mode);
    };

    return (
        <div
            className={clsx(
                'pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-2 py-1 shadow-card',
                className,
            )}
            role="group"
            aria-label="Dashboard view modes"
        >
            {views.map((mode) => {
                const config = VIEW_LABELS[mode];
                if (!config) {
                    return null;
                }

                const active = value === mode;

                return (
                    <button
                        key={mode}
                        type="button"
                        className={clsx(
                            'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                            active
                                ? 'bg-accent-soft text-accent-contrast'
                                : 'text-text-subtle hover:text-text-primary',
                        )}
                        aria-pressed={active}
                        onClick={handleSelect(mode)}
                    >
                        <Icon
                            name={config.icon}
                            className={clsx('h-4 w-4', active ? 'text-accent-contrast' : 'text-text-subtle')}
                        />
                        <span className="hidden sm:inline">{config.label}</span>
                        <span className="sr-only">{config.description}</span>
                    </button>
                );
            })}
        </div>
    );
}
