declare module 'recharts' {
    export type TooltipContentProps<TValue = any, TName = any> = {
        active?: boolean;
        payload?: Array<{ value?: TValue; name?: TName; dataKey?: string }>;
        label?: string;
    };

    const Recharts: any;
    export default Recharts;
}

declare module 'recharts/*' {
    const RechartsModule: any;
    export default RechartsModule;
}
