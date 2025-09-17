declare module 'netlify-identity-widget' {
    export type User = {
        app_metadata?: {
            roles?: unknown[];
            [key: string]: unknown;
        };
        user_metadata?: {
            [key: string]: unknown;
        };
        email?: string;
        id?: string;
        token?: (() => { access_token?: string | null } | null) | null;
        jwt: () => Promise<string>;
        refresh: () => Promise<User | null>;
        [key: string]: unknown;
    };

    type IdentityListener = (...args: unknown[]) => void;

    export type NetlifyIdentity = {
        init: (options?: unknown) => void;
        open: (view?: string) => void;
        close: () => void;
        on: (event: string, callback: IdentityListener) => void;
        off: (event: string, callback: IdentityListener) => void;
        logout: () => Promise<void>;
        currentUser: () => User | null;
    };

    export const widget: NetlifyIdentity;
    export const identity: NetlifyIdentity;

    const defaultExport: NetlifyIdentity;

    export default defaultExport;
}
