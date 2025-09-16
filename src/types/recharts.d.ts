declare module 'recharts' {
    export * from 'recharts/types/index';

    const Recharts: typeof import('recharts/types/index');
    export default Recharts;
}

declare module 'recharts/*' {
    const RechartsModule: any;
    export default RechartsModule;
}
