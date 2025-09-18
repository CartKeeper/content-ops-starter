import * as React from 'react';
import classNames from 'classnames';

type DashboardCardProps = {
    title: string;
    value: string;
    trend?: {
        value: string;
        label?: string;
        isPositive?: boolean;
    };
    className?: string;
    children?: React.ReactNode;
};

const trendBadgeClassNames = (isPositive?: boolean) =>
    classNames('badge d-inline-flex align-items-center gap-2 text-uppercase fw-semibold', {
        'bg-success text-white': isPositive !== false,
        'bg-danger text-white': isPositive === false
    });

export function DashboardCard({ title, value, trend, className, children }: DashboardCardProps) {
    return (
        <div
            className={classNames('card card-stacked h-100 overflow-hidden text-white', className)}
            style={{
                background: 'linear-gradient(135deg, var(--tblr-primary) 0%, #5b8def 45%, #40c2ff 100%)'
            }}
        >
            <div className="card-body position-relative">
                <div className="card-pretitle text-uppercase text-white-75 fw-semibold">{title}</div>
                <div className="display-6 fw-semibold">{value}</div>
                {trend && (
                    <div className="mt-3 text-uppercase fw-semibold">
                        <span className={trendBadgeClassNames(trend.isPositive)}>{trend.value}</span>
                        {trend.label ? <span className="ms-3 text-white-70">{trend.label}</span> : null}
                    </div>
                )}
                {children ? (
                    <div className="card mt-4 mb-0 border-0 bg-white bg-opacity-10 text-white">
                        <div className="card-body text-white-85">{children}</div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default DashboardCard;
