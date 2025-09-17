declare module '@netlify/functions' {
    export type HandlerEvent = Record<string, unknown>;

    export type HandlerContext = {
        functionName?: string;
        invocationId?: string;
        [key: string]: unknown;
    };

    export type HandlerResult = {
        statusCode: number;
        headers?: Record<string, string>;
        body: string;
    };

    export type Handler = (
        event: HandlerEvent,
        context: HandlerContext
    ) => HandlerResult | Promise<HandlerResult>;
}
