'use client';

import * as React from 'react';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { SETTINGS_TABS, type SettingsSection } from './settings-sections';

type SettingsTabsProps = {
    activeSection: SettingsSection;
};

export function SettingsTabs({ activeSection }: SettingsTabsProps) {
    const router = useRouter();

    const normalizedPath = React.useMemo(() => {
        const asPath = router.asPath ?? '';
        const [path] = asPath.split('?');
        return path;
    }, [router.asPath]);

    const derivedActive = React.useMemo(() => {
        const match = SETTINGS_TABS.find((tab) => {
            if (!normalizedPath) {
                return false;
            }
            if (normalizedPath === tab.href) {
                return true;
            }
            return normalizedPath.startsWith(`${tab.href}/`);
        });
        return match?.id ?? activeSection;
    }, [activeSection, normalizedPath]);

    return (
        <nav
            className="flex min-h-[3rem] items-center gap-2 overflow-x-auto pb-1 pt-2"
            role="tablist"
            aria-label="Settings"
        >
            {SETTINGS_TABS.map((tab) => {
                const isActive = tab.id === derivedActive;
                const tabClasses = classNames(
                    'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4DE5FF] focus-visible:ring-offset-slate-950',
                    {
                        'bg-white/15 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)]': isActive,
                        'text-slate-300 hover:bg-white/10 hover:text-white': !isActive
                    }
                );

                return (
                    <Link
                        key={tab.id}
                        href={tab.href}
                        role="tab"
                        aria-selected={isActive}
                        aria-current={isActive ? 'page' : undefined}
                        className={tabClasses}
                        tabIndex={isActive ? 0 : -1}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
