import * as React from 'react';

export type QuickActionModalType = 'booking' | 'invoice' | 'gallery';

export type QuickActionDynamicField = {
    id: string;
    label: string;
    description: string;
    inputType: 'text' | 'textarea' | 'checkbox' | 'url';
    placeholder?: string;
    defaultValue?: string | boolean;
    modalTypes: QuickActionModalType[];
};

type QuickActionSettingsState = Record<string, boolean>;

type QuickActionSettingsContextValue = {
    fields: QuickActionDynamicField[];
    activeFields: QuickActionSettingsState;
    setFieldActive: (id: string, isActive: boolean) => void;
    toggleField: (id: string) => void;
    getActiveFieldsForModal: (modalType: QuickActionModalType) => QuickActionDynamicField[];
};

const QuickActionSettingsContext = React.createContext<QuickActionSettingsContextValue | undefined>(undefined);

const STORAGE_KEY = 'crm-quick-action-fields';

const defaultFields: QuickActionDynamicField[] = [
    {
        id: 'shot-list',
        label: 'Shot list link',
        description: 'Attach Google Docs or Notion boards to shoots.',
        inputType: 'url',
        placeholder: 'https://',
        modalTypes: ['booking', 'gallery']
    },
    {
        id: 'travel-notes',
        label: 'Travel notes',
        description: 'Collect parking, access, and travel tips.',
        inputType: 'textarea',
        placeholder: 'Parking instructions, load-in details…',
        modalTypes: ['booking']
    },
    {
        id: 'assistant',
        label: 'Assistant assignment',
        description: 'Track who is supporting on-site.',
        inputType: 'text',
        placeholder: 'Name of assistant',
        modalTypes: ['booking']
    },
    {
        id: 'invoice-notes',
        label: 'Invoice terms',
        description: 'Define payment schedules and policies.',
        inputType: 'textarea',
        placeholder: 'Net 30, retainers, delivery terms…',
        modalTypes: ['invoice']
    },
    {
        id: 'gallery-password',
        label: 'Gallery password',
        description: 'Set unique access codes per client.',
        inputType: 'text',
        placeholder: 'Optional password',
        modalTypes: ['gallery']
    },
    {
        id: 'client-portal',
        label: 'Client portal toggle',
        description: 'Grant or revoke portal access instantly.',
        inputType: 'checkbox',
        defaultValue: true,
        modalTypes: ['booking', 'invoice', 'gallery']
    }
];

const buildDefaultState = (): QuickActionSettingsState =>
    defaultFields.reduce<QuickActionSettingsState>((state, field) => {
        state[field.id] = true;
        return state;
    }, {});

export function QuickActionSettingsProvider({ children }: { children: React.ReactNode }) {
    const [activeFields, setActiveFields] = React.useState<QuickActionSettingsState>(() => buildDefaultState());

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as QuickActionSettingsState;
                setActiveFields((previous) => ({ ...previous, ...parsed }));
            }
        } catch (error) {
            console.warn('Unable to read quick action field preferences', error);
        }
    }, []);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(activeFields));
        } catch (error) {
            console.warn('Unable to persist quick action field preferences', error);
        }
    }, [activeFields]);

    const setFieldActive = React.useCallback((id: string, isActive: boolean) => {
        setActiveFields((previous) => ({ ...previous, [id]: isActive }));
    }, []);

    const toggleField = React.useCallback((id: string) => {
        setActiveFields((previous) => ({ ...previous, [id]: !previous[id] }));
    }, []);

    const getActiveFieldsForModal = React.useCallback(
        (modalType: QuickActionModalType) =>
            defaultFields.filter((field) => field.modalTypes.includes(modalType) && activeFields[field.id] !== false),
        [activeFields]
    );

    const contextValue = React.useMemo(
        () => ({
            fields: defaultFields,
            activeFields,
            setFieldActive,
            toggleField,
            getActiveFieldsForModal
        }),
        [activeFields, getActiveFieldsForModal, setFieldActive, toggleField]
    );

    return <QuickActionSettingsContext.Provider value={contextValue}>{children}</QuickActionSettingsContext.Provider>;
}

export function useQuickActionSettings() {
    const context = React.useContext(QuickActionSettingsContext);
    if (!context) {
        throw new Error('useQuickActionSettings must be used within a QuickActionSettingsProvider');
    }
    return context;
}

