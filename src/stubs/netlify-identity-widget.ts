export type Listener = (...args: unknown[]) => void;

type ListenerRegistry = Record<string, Set<Listener>>;

const listeners: ListenerRegistry = {};

function register(event: string, callback: Listener) {
    if (!listeners[event]) {
        listeners[event] = new Set();
    }
    listeners[event].add(callback);
}

function unregister(event: string, callback: Listener) {
    listeners[event]?.delete(callback);
}

const baseIdentity = {
    init: () => undefined,
    open: () => undefined,
    close: () => undefined,
    on: (event: string, callback: Listener) => register(event, callback),
    off: (event: string, callback: Listener) => unregister(event, callback),
    logout: async () => undefined,
    currentUser: () => null
};

export const widget = baseIdentity;
export const identity = baseIdentity;
export default baseIdentity;
