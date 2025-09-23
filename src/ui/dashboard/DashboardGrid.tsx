import type { ReactNode } from 'react';
import clsx from 'classnames';

export type DashboardViewMode = 'overview' | 'revenue' | 'client';

export type DashboardCardKey =
    | 'overview-chart'
    | 'studio-signal'
    | 'upcoming-shoots'
    | 'active-clients'
    | 'open-invoices'
    | 'studio-tasks'
    | 'galleries'
    | 'team-performance';

const CARD_REGISTRY: Record<DashboardCardKey, { className: string }> = {
    'overview-chart': { className: 'col-span-12 xl:col-span-7' },
    'studio-signal': { className: 'col-span-12 xl:col-span-5' },
    'upcoming-shoots': { className: 'col-span-12 xl:col-span-6' },
    'active-clients': { className: 'col-span-12 xl:col-span-6' },
    'open-invoices': { className: 'col-span-12 xl:col-span-6' },
    'studio-tasks': { className: 'col-span-12 xl:col-span-6' },
    galleries: { className: 'col-span-12 xl:col-span-4' },
    'team-performance': { className: 'col-span-12' },
};

const DEFAULT_LAYOUT: Record<DashboardViewMode, DashboardCardKey[]> = {
    overview: [
        'overview-chart',
        'studio-signal',
        'upcoming-shoots',
        'active-clients',
        'open-invoices',
        'studio-tasks',
        'galleries',
        'team-performance',
    ],
    revenue: [
        'studio-signal',
        'overview-chart',
        'open-invoices',
        'studio-tasks',
        'upcoming-shoots',
        'active-clients',
        'galleries',
        'team-performance',
    ],
    client: [
        'overview-chart',
        'studio-signal',
        'active-clients',
        'upcoming-shoots',
        'studio-tasks',
        'galleries',
        'open-invoices',
        'team-performance',
    ],
};

export type DashboardGridProps = {
    view: DashboardViewMode;
    cards: Partial<Record<DashboardCardKey, ReactNode>>;
    layout?: Partial<Record<DashboardViewMode, DashboardCardKey[]>>;
    className?: string;
};

export function DashboardGrid({ view, cards, layout, className }: DashboardGridProps) {
    const order = layout?.[view] ?? DEFAULT_LAYOUT[view];

    return (
        <div className={clsx('grid grid-cols-1 gap-6 xl:grid-cols-12', className)}>
            {order.map((cardId) => {
                const element = cards[cardId];
                if (!element) {
                    return null;
                }

                const registry = CARD_REGISTRY[cardId] ?? { className: 'col-span-12' };

                return (
                    <div key={cardId} className={clsx('col-span-12', registry.className)}>
                        {element}
                    </div>
                );
            })}
        </div>
    );
}

export const DASHBOARD_CARD_REGISTRY = CARD_REGISTRY;
export const DASHBOARD_VIEW_LAYOUT = DEFAULT_LAYOUT;
