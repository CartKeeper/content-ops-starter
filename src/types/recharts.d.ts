declare module 'recharts' {
    export * from 'recharts/types/index.js';

    const Recharts: typeof import('recharts/types/index.js');
    export default Recharts;
}

declare module 'recharts/*' {
    export * from 'recharts/types/index.js';

    const RechartsModule: typeof import('recharts/types/index.js');
    export default RechartsModule;
}
