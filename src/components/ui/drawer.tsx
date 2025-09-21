import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '../../lib/cn';

const Drawer = DialogPrimitive.Root;
const DrawerTrigger = DialogPrimitive.Trigger;
const DrawerPortal = DialogPrimitive.Portal;

const DrawerOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn('offcanvas-backdrop fade show', className)}
        {...props}
    />
));
DrawerOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <DrawerPortal>
        <DrawerOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn('offcanvas offcanvas-end show', className)}
            {...props}
        >
            <div className="offcanvas-body d-flex flex-column gap-4">{children}</div>
        </DialogPrimitive.Content>
    </DrawerPortal>
));
DrawerContent.displayName = DialogPrimitive.Content.displayName;

const DrawerHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('offcanvas-header', className)} {...props} />
));
DrawerHeader.displayName = 'DrawerHeader';

const DrawerFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('offcanvas-footer border-top pt-3 d-flex gap-2 justify-content-end', className)} {...props} />
));
DrawerFooter.displayName = 'DrawerFooter';

const DrawerTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title ref={ref} className={cn('offcanvas-title h4 mb-0', className)} {...props} />
));
DrawerTitle.displayName = DialogPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description ref={ref} className={cn('text-secondary', className)} {...props} />
));
DrawerDescription.displayName = DialogPrimitive.Description.displayName;

const DrawerClose = DialogPrimitive.Close;

export {
    Drawer,
    DrawerTrigger,
    DrawerContent,
    DrawerHeader,
    DrawerFooter,
    DrawerTitle,
    DrawerDescription,
    DrawerClose
};
