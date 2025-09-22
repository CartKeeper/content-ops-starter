import * as React from 'react';

import cn from '../../lib/cn';

export type FieldGridProps = React.HTMLAttributes<HTMLDivElement>;

export function FieldGrid({ className, ...props }: FieldGridProps) {
    return <div className={cn('grid grid-cols-12 gap-4', className)} {...props} />;
}
