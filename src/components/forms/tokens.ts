export const sizeCols: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
    xs: 'col-span-12 sm:col-span-6 lg:col-span-3',
    sm: 'col-span-12 sm:col-span-6 lg:col-span-4',
    md: 'col-span-12 sm:col-span-6 lg:col-span-6',
    lg: 'col-span-12 sm:col-span-8 lg:col-span-8',
    xl: 'col-span-12'
};

export type FieldSize = keyof typeof sizeCols;
