import * as React from 'react';
import classNames from 'classnames';

import { CRM_BRAND_ACCENT_GLOW, CRM_BRAND_ACCENT_GLOW_SOFT, GLASS_PANEL_CLASSNAME } from './theme';

type SectionCardProps = {
    title: string;
    description?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
};

export function SectionCard({ title, description, action, children, className }: SectionCardProps) {
    return (
        <section className={classNames(GLASS_PANEL_CLASSNAME, 'p-6', className)}>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW}, transparent 65%)` }}
            />
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW_SOFT}, transparent 70%)` }}
            />
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
                    {description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>}
                </div>
                {action && (
                    <div className="relative z-10 flex shrink-0 items-center gap-2 text-sm font-semibold text-[#0F766E] dark:text-[#5EEAD4]">
                        {action}
                    </div>
                )}
            </div>
            <div className="relative z-10 mt-5">{children}</div>
        </section>
    );
}

export default SectionCard;
