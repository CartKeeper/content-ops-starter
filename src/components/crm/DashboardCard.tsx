import type { ReactNode } from 'react';

type DashboardCardProps = {
    title: string;
    value: string;
    accent?: string;
    description?: string;
    icon?: ReactNode;
};

export function DashboardCard({ title, value, accent, description, icon }: DashboardCardProps) {
    return (
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40 transition hover:-translate-y-1 hover:border-emerald-500/40 hover:bg-slate-900">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-slate-900 opacity-0 transition duration-300 group-hover:opacity-100" />
            <div className="relative flex items-start justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
                    {accent && <p className="mt-1 text-xs font-medium text-emerald-300">{accent}</p>}
                </div>
                {icon && <div className="text-emerald-300">{icon}</div>}
            </div>
            {description && <p className="relative mt-6 text-sm leading-relaxed text-slate-300">{description}</p>}
        </div>
    );
}
