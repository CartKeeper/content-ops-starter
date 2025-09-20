import * as React from 'react';

import { cn } from '../../lib/cn';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn('text-sm font-semibold text-slate-200', className)}
        {...props}
    />
));
Label.displayName = 'Label';
