import type { ReactNode } from 'react';
import Link from 'next/link';
import clsx from 'classnames';

import { Icon } from '../icons';
import { matchPath, type SecondaryNavItem } from './navigation';

type SubNavProps = {
    items: SecondaryNavItem[];
    currentPath?: string;
    trailing?: ReactNode;
};

export function SubNav({ items, currentPath = '', trailing }: SubNavProps) {
    if (!items || items.length === 0) {
        return null;
    }

    return (
        <div className="border-b border-border-subtle bg-surface">
            <div className="mx-auto flex w-full max-w-7xl items-start gap-4 px-4">
                <nav
                    className="flex flex-1 items-center gap-2 overflow-x-auto py-3"
                    aria-label="Secondary navigation"
                >
                    {items.map((item) => {
                        const isActive = matchPath(currentPath, item.href);
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={clsx(
                                    'inline-flex items-center gap-2 whitespace-nowrap rounded-pill px-3 py-1.5 text-sm font-medium transition-colors duration-150',
                                    isActive
                                        ? 'bg-surface-muted text-text-primary shadow-sm'
                                        : 'text-text-subtle hover:bg-surface-muted hover:text-text-primary'
                                )}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {item.icon ? <Icon name={item.icon} className="h-4 w-4" /> : null}
                                <span>{item.label}</span>
                                {item.badge ? (
                                    <span className="rounded-pill bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-subtle">
                                        {item.badge}
                                    </span>
                                ) : null}
                            </Link>
                        );
                    })}
                </nav>
                {trailing ? (
                    <div className="hidden items-center gap-2 py-3 md:flex">{trailing}</div>
                ) : null}
            </div>
        </div>
    );
}
