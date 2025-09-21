import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '../../lib/cn';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
    ({ className, ...props }, ref) => (
        <DialogPrimitive.Overlay
            ref={ref}
            className={cn('modal-backdrop fade show', className)}
            {...props}
        />
    )
);
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(
    ({ className, children, ...props }, ref) => (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
                ref={ref}
                className="modal modal-blur fade show d-block"
                {...props}
            >
                <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
                    <div className={cn('modal-content shadow-sm', className)}>{children}</div>
                </div>
            </DialogPrimitive.Content>
        </DialogPortal>
    )
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('modal-header', className)} {...props} />
));
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('modal-footer', className)} {...props} />
));
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
    ({ className, ...props }, ref) => (
        <DialogPrimitive.Title
            ref={ref}
            className={cn('modal-title', className)}
            {...props}
        />
    )
);
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(
    ({ className, ...props }, ref) => (
        <DialogPrimitive.Description
            ref={ref}
            className={cn('text-secondary', className)}
            {...props}
        />
    )
);
DialogDescription.displayName = DialogPrimitive.Description.displayName;

const DialogClose = DialogPrimitive.Close;

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
    DialogClose,
};
