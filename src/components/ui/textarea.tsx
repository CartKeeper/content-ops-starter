import * as React from 'react';

import { cn } from '../../lib/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
    <textarea
        ref={ref}
        className={cn(
            'form-control',
            className
        )}
        {...props}
    />
));
Textarea.displayName = 'Textarea';
