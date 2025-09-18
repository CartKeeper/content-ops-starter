import * as React from 'react';

import {
    INTEGRATION_DEFINITION_MAP,
    INTEGRATION_DEFINITIONS,
    IntegrationDefinition
} from '../../data/integrations';

type IntegrationStatus = 'Connected' | 'Syncing';

type StoredIntegration = {
    id: string;
    status: IntegrationStatus;
};

type ConnectedIntegration = StoredIntegration & {
    definition: IntegrationDefinition;
};

type IntegrationContextValue = {
    availableIntegrations: IntegrationDefinition[];
    connectedIntegrations: ConnectedIntegration[];
    connectIntegration: (id: string, status?: IntegrationStatus) => void;
    disconnectIntegration: (id: string) => void;
    setIntegrationStatus: (id: string, status: IntegrationStatus) => void;
    isConnected: (id: string) => boolean;
};

const STORAGE_KEY = 'crm-connected-integrations';
const DEFAULT_CONNECTED: StoredIntegration[] = [
    { id: 'google-drive', status: 'Connected' },
    { id: 'google-calendar', status: 'Connected' },
    { id: 'instagram-business', status: 'Syncing' }
];

function normalizeEntries(entries: unknown): StoredIntegration[] {
    if (!Array.isArray(entries)) {
        return DEFAULT_CONNECTED;
    }

    const seen = new Set<string>();

    return entries
        .map((entry) => {
            if (!entry || typeof entry !== 'object') {
                return null;
            }

            const id = 'id' in entry && typeof entry.id === 'string' ? entry.id : null;
            const status = 'status' in entry && typeof entry.status === 'string' ? entry.status : null;
            if (!id || (status !== 'Connected' && status !== 'Syncing')) {
                return null;
            }

            if (!INTEGRATION_DEFINITION_MAP[id]) {
                return null;
            }

            if (seen.has(id)) {
                return null;
            }

            seen.add(id);
            return { id, status } as StoredIntegration;
        })
        .filter((entry): entry is StoredIntegration => entry !== null);
}

function loadStoredIntegrations(): StoredIntegration[] {
    if (typeof window === 'undefined') {
        return DEFAULT_CONNECTED;
    }

    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return DEFAULT_CONNECTED;
        }

        const parsed = JSON.parse(stored);
        const normalized = normalizeEntries(parsed);
        return normalized.length > 0 ? normalized : DEFAULT_CONNECTED;
    } catch (error) {
        console.warn('Unable to read stored integrations', error);
        return DEFAULT_CONNECTED;
    }
}

const IntegrationContext = React.createContext<IntegrationContextValue | undefined>(undefined);

export function IntegrationProvider({ children }: { children: React.ReactNode }) {
    const [connected, setConnected] = React.useState<StoredIntegration[]>(() => loadStoredIntegrations());

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(connected));
        } catch (error) {
            console.warn('Unable to persist integrations', error);
        }
    }, [connected]);

    const connectIntegration = React.useCallback((id: string, status: IntegrationStatus = 'Connected') => {
        setConnected((previous) => {
            if (previous.some((entry) => entry.id === id)) {
                return previous.map((entry) => (entry.id === id ? { ...entry, status } : entry));
            }

            if (!INTEGRATION_DEFINITION_MAP[id]) {
                return previous;
            }

            return [...previous, { id, status } as StoredIntegration];
        });
    }, []);

    const disconnectIntegration = React.useCallback((id: string) => {
        setConnected((previous) => previous.filter((entry) => entry.id !== id));
    }, []);

    const setIntegrationStatus = React.useCallback((id: string, status: IntegrationStatus) => {
        setConnected((previous) =>
            previous.map((entry) => (entry.id === id ? { ...entry, status } : entry))
        );
    }, []);

    const connectedIntegrations = React.useMemo<ConnectedIntegration[]>(() => {
        return connected
            .map((entry) => {
                const definition = INTEGRATION_DEFINITION_MAP[entry.id];
                if (!definition) {
                    return null;
                }

                return { ...entry, definition } as ConnectedIntegration;
            })
            .filter((entry): entry is ConnectedIntegration => entry !== null);
    }, [connected]);

    const value = React.useMemo<IntegrationContextValue>(
        () => ({
            availableIntegrations: INTEGRATION_DEFINITIONS,
            connectedIntegrations,
            connectIntegration,
            disconnectIntegration,
            setIntegrationStatus,
            isConnected: (id: string) => connectedIntegrations.some((entry) => entry.id === id)
        }),
        [connectIntegration, connectedIntegrations, disconnectIntegration, setIntegrationStatus]
    );

    return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
}

export function useIntegrations(): IntegrationContextValue {
    const context = React.useContext(IntegrationContext);
    if (!context) {
        throw new Error('useIntegrations must be used within an IntegrationProvider');
    }
    return context;
}

export type { IntegrationStatus, ConnectedIntegration };
