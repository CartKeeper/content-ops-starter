'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import clsx from 'classnames';

import { Icon } from '../icons';
import { matchPath, type PrimaryNavItem } from './navigation';

type RenderContext = { context: 'desktop' | 'mobile' };

type TopNavSlot = ReactNode | ((context: RenderContext) => ReactNode);

type TopNavProps = {
    navigation: PrimaryNavItem[];
    currentPath?: string;
    brand?: ReactNode;
    searchSlot?: TopNavSlot;
    actionsSlot?: TopNavSlot;
};

function renderSlot(slot: TopNavSlot | undefined, context: RenderContext['context']) {
    if (!slot) {
        return null;
    }

    if (typeof slot === 'function') {
        return slot({ context });
    }

    return slot;
}

export function TopNav({ navigation, currentPath = '', brand, searchSlot, actionsSlot }: TopNavProps) {
    const [isMobileNavOpen, setMobileNavOpen] = useState(false);

    return (
        <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-4">
                <div className="flex flex-1 items-center gap-6">
                    <div className="flex items-center gap-2 text-text-primary">{brand}</div>
                    <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
                        {navigation.map((item) => {
                            const isActive = matchPath(currentPath, item.href);
                            return (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    className={clsx(
                                        'inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-sm font-medium transition-colors duration-150',
                                        isActive
                                            ? 'bg-surface-muted text-text-primary shadow-sm'
                                            : 'text-text-subtle hover:bg-surface-muted hover:text-text-primary'
                                    )}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <Icon name={item.icon} className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="hidden flex-1 justify-center lg:flex">
                    {searchSlot ? <div className="w-full max-w-sm">{renderSlot(searchSlot, 'desktop')}</div> : null}
                </div>
                <div className="hidden items-center gap-2 lg:flex">
                    {renderSlot(actionsSlot, 'desktop')}
                </div>
                <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-card border border-border-subtle text-text-primary lg:hidden"
                    aria-label="Toggle navigation"
                    aria-expanded={isMobileNavOpen}
                    onClick={() => setMobileNavOpen((open) => !open)}
                >
                    <Icon name={isMobileNavOpen ? 'x' : 'menu'} className="h-5 w-5" />
                </button>
            </div>
            <div
                className={clsx(
                    'border-t border-border-subtle bg-surface shadow-sm lg:hidden',
                    isMobileNavOpen ? 'block' : 'hidden'
                )}
            >
                {searchSlot ? <div className="px-4 py-3">{renderSlot(searchSlot, 'mobile')}</div> : null}
                <nav className="flex flex-col gap-1 px-2 py-3" aria-label="Primary">
                    {navigation.map((item) => {
                        const isActive = matchPath(currentPath, item.href);
                        return (
                            <Link
                                key={`mobile-${item.key}`}
                                href={item.href}
                                className={clsx(
                                    'flex items-center gap-3 rounded-card px-3 py-2 text-base font-medium transition-colors duration-150',
                                    isActive
                                        ? 'bg-surface-muted text-text-primary shadow-sm'
                                        : 'text-text-subtle hover:bg-surface-muted hover:text-text-primary'
                                )}
                                aria-current={isActive ? 'page' : undefined}
                                onClick={() => setMobileNavOpen(false)}
                            >
                                <Icon name={item.icon} className="h-5 w-5" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
                {actionsSlot ? (
                    <div className="space-y-2 border-t border-border-subtle px-4 py-3">
                        {renderSlot(actionsSlot, 'mobile')}
                    </div>
                ) : null}
            </div>
        </header>
    );
}
