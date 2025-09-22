import * as React from 'react';

import cn from '../../lib/cn';

export type SectionCardProps = {
    title: string;
    subtitle?: string;
    eyebrow?: string;
    actions?: React.ReactNode;
    stickyHeader?: boolean;
    children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export function SectionCard({
    title,
    subtitle,
    eyebrow,
    actions,
    stickyHeader,
    children,
    className,
    ...props
}: SectionCardProps) {
    return (
        <section
            className={cn('rounded-3xl border border-slate-800/80 bg-slate-950/60 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.95)]', className)}
            {...props}
        >
            <header
                className={cn(
                    'flex flex-col gap-4 border-b border-white/5 px-6 py-4 md:flex-row md:items-center md:justify-between',
                    stickyHeader &&
                        'md:sticky md:top-20 md:z-20 md:border-white/5 md:bg-slate-950/80 md:shadow-[0_20px_40px_-40px_rgba(15,23,42,0.95)] md:backdrop-blur'
                )}
            >
                <div className="space-y-1">
                    {eyebrow ? (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">{eyebrow}</p>
                    ) : null}
                    <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
                    {subtitle ? <p className="text-sm text-slate-300">{subtitle}</p> : null}
                </div>
                {actions ? <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
            </header>
            <div className="px-6 py-6">{children}</div>
        </section>
    );
}

export type FormSectionCardProps = {
    title: string;
    subtitle?: string;
    eyebrow?: string;
    actions?: React.ReactNode;
    stickyHeader?: boolean;
    children: React.ReactNode;
} & React.FormHTMLAttributes<HTMLFormElement>;

export function FormSectionCard({
    title,
    subtitle,
    eyebrow,
    actions,
    stickyHeader = true,
    children,
    className,
    ...props
}: FormSectionCardProps) {
    return (
        <form
            className={cn('rounded-3xl border border-slate-800/80 bg-slate-950/60 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.95)]', className)}
            {...props}
        >
            <div
                className={cn(
                    'flex flex-col gap-4 border-b border-white/5 px-6 py-4 md:flex-row md:items-center md:justify-between',
                    stickyHeader &&
                        'md:sticky md:top-24 md:z-20 md:border-white/5 md:bg-slate-950/80 md:shadow-[0_20px_40px_-40px_rgba(15,23,42,0.95)] md:backdrop-blur'
                )}
            >
                <div className="space-y-1">
                    {eyebrow ? (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">{eyebrow}</p>
                    ) : null}
                    <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
                    {subtitle ? <p className="text-sm text-slate-300">{subtitle}</p> : null}
                </div>
                {actions ? <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
            </div>
            <div className="px-6 py-6">{children}</div>
        </form>
    );
}
