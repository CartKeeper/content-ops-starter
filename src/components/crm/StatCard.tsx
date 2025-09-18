import * as React from 'react';
import classNames from 'classnames';

type StatCardProps = {
    title: string;
    value: string;
    change: number;
    changeLabel: string;
    icon: React.ReactNode;
};

const formatChange = (change: number) => {
    const rounded = Number.isFinite(change) ? Math.abs(change).toFixed(1) : '0.0';
    const sign = change >= 0 ? '+' : '-';
    return `${sign}${rounded}%`;
};

export function StatCard({ title, value, change, changeLabel, icon }: StatCardProps) {
    const isPositive = change >= 0;
    const TrendIcon = isPositive ? TrendUpIcon : TrendDownIcon;

    return (
        <div className="card card-stacked h-100">
            <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                    <span className="avatar avatar-md bg-primary-lt text-primary">
                        <span className="icon" aria-hidden="true">
                            {icon}
                        </span>
                    </span>
                </div>
                <div className="mt-3">
                    <div className="subheader">{title}</div>
                    <div className="h1 mb-2">{value}</div>
                    <div className="d-flex align-items-center gap-2 text-uppercase fw-semibold">
                        <span
                            className={classNames('badge d-inline-flex align-items-center gap-2', {
                                'bg-success-lt text-success': isPositive,
                                'bg-danger-lt text-danger': !isPositive
                            })}
                        >
                            <TrendIcon className="icon" />
                            {formatChange(change)}
                        </span>
                        <span className="text-secondary">{changeLabel}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

type IconProps = React.SVGProps<SVGSVGElement>;

function TrendUpIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M4 14 10 8 14 12 20 6" />
            <path d="M20 10V6h-4" />
        </svg>
    );
}

function TrendDownIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M20 10 14 16 10 12 4 18" />
            <path d="M4 14v4h4" />
        </svg>
    );
}

export default StatCard;
