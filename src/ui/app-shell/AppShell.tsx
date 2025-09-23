'use client';

import { useMemo, type ReactNode } from 'react';
import clsx from 'classnames';

import { APP_NAVIGATION, matchPath, type PrimaryNavItem, type SecondaryNavItem } from './navigation';
import { TopNav } from './TopNav';
import { SubNav } from './SubNav';
import { Footer } from './Footer';

type AppShellProps = {
    children: ReactNode;
    currentPath?: string;
    navigation?: PrimaryNavItem[];
    secondaryNavigation?: SecondaryNavItem[];
    brand?: ReactNode;
    renderSearch?: (context: { context: 'desktop' | 'mobile' }) => ReactNode;
    renderActions?: (context: { context: 'desktop' | 'mobile' }) => ReactNode;
    subNavTrailing?: ReactNode;
    footerSlot?: ReactNode;
    className?: string;
};

export function AppShell({
    children,
    currentPath = '',
    navigation,
    secondaryNavigation,
    brand,
    renderSearch,
    renderActions,
    subNavTrailing,
    footerSlot,
    className
}: AppShellProps) {
    const navItems = navigation ?? APP_NAVIGATION;

    const resolvedSecondary = useMemo(() => {
        if (secondaryNavigation) {
            return secondaryNavigation;
        }

        const activePrimary = navItems.find((item) => matchPath(currentPath, item.href));
        return activePrimary?.children ?? [];
    }, [navItems, secondaryNavigation, currentPath]);

    return (
        <div className={clsx('flex min-h-dvh flex-col bg-surface-page text-text-primary', className)}>
            <TopNav
                navigation={navItems}
                currentPath={currentPath}
                brand={brand}
                searchSlot={renderSearch}
                actionsSlot={renderActions}
            />
            {resolvedSecondary.length > 0 ? (
                <SubNav items={resolvedSecondary} currentPath={currentPath} trailing={subNavTrailing} />
            ) : null}
            <main className="flex-1 pb-12 pt-6">{children}</main>
            <Footer>{footerSlot}</Footer>
        </div>
    );
}
