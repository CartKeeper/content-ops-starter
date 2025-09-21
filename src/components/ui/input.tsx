import * as React from 'react';

import { cn } from '../../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
    return (
        <input
            ref={ref}
            type={type}
            className={cn(
                'form-control',
                className
            )}
            {...props}
        />
    );
});
Input.displayName = 'Input';
