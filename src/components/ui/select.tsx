import * as React from 'react';

import { cn } from '../../lib/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
    <select
        ref={ref}
        className={cn(
            'form-select',
            className
        )}
        {...props}
    >
        {children}
    </select>
));
Select.displayName = 'Select';
