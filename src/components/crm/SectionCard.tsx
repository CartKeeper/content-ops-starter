import * as React from 'react';
import classNames from 'classnames';

type SectionCardProps = {
    title: string;
    description?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
};

export function SectionCard({ title, description, action, children, className }: SectionCardProps) {
    return (
        <section className={classNames('card card-stacked h-100', className)}>
            <div className="card-body">
                <div className="d-flex align-items-start justify-content-between gap-3">
                    <div>
                        <h2 className="card-title mb-1">{title}</h2>
                        {description ? <p className="text-secondary">{description}</p> : null}
                    </div>
                    {action ? <div className="text-nowrap">{action}</div> : null}
                </div>
                <div className="mt-4">{children}</div>
            </div>
        </section>
    );
}

export default SectionCard;
