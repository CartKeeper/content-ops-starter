import clsx from 'classnames';

export type DividerProps = {
    orientation?: 'horizontal' | 'vertical';
    className?: string;
};

export function Divider({ orientation = 'horizontal', className }: DividerProps) {
    if (orientation === 'vertical') {
        return <span className={clsx('mx-2 w-px self-stretch bg-border-subtle', className)} aria-hidden />;
    }

    return <span className={clsx('my-4 block h-px w-full bg-border-subtle', className)} aria-hidden />;
}
