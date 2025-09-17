import * as React from 'react';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'framer-motion';

import {
    BookingList,
    ClientTable,
    InvoiceTable,
    OverviewChart,
    SectionCard,
    StatCard,
    TaskList,
    ApertureMark,
    CrmAuthGuard,
    type BookingRecord,
    type BookingStatus,
    type InvoiceRecord,
    type InvoiceStatus,
    type ChartPoint
} from '../../components/crm';
import { EarningsSummaryCard } from '../../components/crm/EarningsSummaryCard';
import { useNetlifyIdentity } from '../../components/auth';
import { InvoiceBuilderModal, type InvoiceBuilderSubmitValues } from '../../components/crm/InvoiceBuilderModal';
import {
    BellIcon,
    CalendarIcon,
    ChevronDownIcon,
    GalleryIcon,
    InvoiceIcon,
    MoonIcon,
    SunIcon
} from '../../components/crm/icons';
import { QuickActionModal, type QuickActionFormField, type QuickActionModalSubmitValues } from '../../components/crm/QuickActionModal';
import type { QuickActionModalType } from '../../components/crm/quick-action-settings';
import { clients, galleryCollection, tasks, type GalleryRecord, type GalleryStatus } from '../../data/crm';
import { readCmsCollection } from '../../utils/read-cms-collection';

const quickActions: { id: string; label: string; modal: QuickActionModalType }[] = [
    { id: 'new-booking', label: 'Schedule shoot', modal: 'booking' },
    { id: 'new-invoice', label: 'Create invoice', modal: 'invoice' },
    { id: 'upload-gallery', label: 'Upload gallery', modal: 'gallery' }
];

const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', href: '/crm', isActive: true },
    { id: 'calendar', label: 'Calendar', href: '/bookings' },
    { id: 'clients', label: 'Clients', href: '/clients' },
    { id: 'invoices', label: 'Invoices', href: '/invoices' },
    { id: 'galleries', label: 'Galleries', href: '/galleries' },
    { id: 'projects', label: 'Projects', href: '#' },
    { id: 'settings', label: 'Settings', href: '#' }
];

type PhotographyCrmDashboardProps = {
    bookings: BookingRecord[];
    invoices: InvoiceRecord[];
};

type FeedbackNotice = {
    id: string;
    type: 'success' | 'error';
    message: string;
};

type DashboardLayoutPreset = 'earnings' | 'insights' | 'custom';
type PrimaryPanelId = 'earnings' | 'overview' | 'profile';

type LayoutOption = {
    id: DashboardLayoutPreset;
    label: string;
    description: string;
};

type StoredLayoutConfig = {
    preset: DashboardLayoutPreset;
    order: PrimaryPanelId[];
    visibility: Record<PrimaryPanelId, boolean>;
};

type PrimaryPanelDefinition = {
    title: string;
    description: string;
    className: string;
    render: () => React.ReactNode;
};

const primaryPanelIds: PrimaryPanelId[] = ['earnings', 'overview', 'profile'];

const panelLayoutPresets: Record<Exclude<DashboardLayoutPreset, 'custom'>, PrimaryPanelId[]> = {
    earnings: ['earnings', 'overview', 'profile'],
    insights: ['overview', 'earnings', 'profile']
};

const layoutOptions: LayoutOption[] = [
    {
        id: 'earnings',
        label: 'Earnings focus',
        description: 'Prioritize revenue metrics with spotlighted cashflow analytics.'
    },
    {
        id: 'insights',
        label: 'Balanced view',
        description: 'Blend calendar, revenue, and studio health indicators together.'
    },
    {
        id: 'custom',
        label: 'Custom layout',
        description: 'Arrange the overview modules to match your personal workflow.'
    }
];

const layoutStorageKey = 'aperture:dashboard-layout';

function PhotographyCrmDashboard({ bookings, invoices }: PhotographyCrmDashboardProps) {
    const [isDarkMode, setIsDarkMode] = React.useState<boolean | null>(null);
    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
    const userMenuRef = React.useRef<HTMLDivElement | null>(null);
    const [bookingList, setBookingList] = React.useState<BookingRecord[]>(() =>
        Array.isArray(bookings) ? bookings : []
    );
    const [invoiceList, setInvoiceList] = React.useState<InvoiceRecord[]>(() =>
        Array.isArray(invoices) ? invoices : []
    );
    const [galleryList, setGalleryList] = React.useState<GalleryRecord[]>(() => [...galleryCollection]);
    const [activeModal, setActiveModal] = React.useState<QuickActionModalType | null>(null);
    const [pdfInvoiceId, setPdfInvoiceId] = React.useState<string | null>(null);
    const [checkoutInvoiceId, setCheckoutInvoiceId] = React.useState<string | null>(null);
    const [feedback, setFeedback] = React.useState<FeedbackNotice | null>(null);
    const identity = useNetlifyIdentity();
    const [layoutPreset, setLayoutPreset] = React.useState<DashboardLayoutPreset>('earnings');
    const [customPanelOrder, setCustomPanelOrder] = React.useState<PrimaryPanelId[]>(() => [...panelLayoutPresets.earnings]);
    const [customPanelVisibility, setCustomPanelVisibility] = React.useState<Record<PrimaryPanelId, boolean>>(() =>
        primaryPanelIds.reduce(
            (accumulator, id) => {
                accumulator[id] = true;
                return accumulator;
            },
            {} as Record<PrimaryPanelId, boolean>
        )
    );

    React.useEffect(() => {
        if (!feedback || typeof window === 'undefined') {
            return;
        }

        const timeout = window.setTimeout(() => setFeedback(null), 8000);
        return () => window.clearTimeout(timeout);
    }, [feedback]);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const storedTheme = window.localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const shouldEnableDark = storedTheme ? storedTheme === 'dark' : prefersDark;
        setIsDarkMode(shouldEnableDark);
    }, []);

    React.useEffect(() => {
        if (typeof window === 'undefined' || isDarkMode === null) {
            return;
        }
        const root = window.document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            window.localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            window.localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const handleClick = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };

        window.document.addEventListener('mousedown', handleClick);
        return () => window.document.removeEventListener('mousedown', handleClick);
    }, []);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const raw = window.localStorage.getItem(layoutStorageKey);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw) as Partial<StoredLayoutConfig>;

            if (parsed.order && Array.isArray(parsed.order)) {
                const filtered = parsed.order.filter((panelId): panelId is PrimaryPanelId =>
                    primaryPanelIds.includes(panelId as PrimaryPanelId)
                );
                const normalized = [...filtered];
                primaryPanelIds.forEach((panelId) => {
                    if (!normalized.includes(panelId)) {
                        normalized.push(panelId);
                    }
                });
                setCustomPanelOrder(normalized);
            }

            if (parsed.visibility) {
                setCustomPanelVisibility((previous) => {
                    const next: Record<PrimaryPanelId, boolean> = { ...previous };
                    primaryPanelIds.forEach((panelId) => {
                        if (typeof parsed.visibility?.[panelId] === 'boolean') {
                            next[panelId] = parsed.visibility[panelId];
                        }
                    });
                    return next;
                });
            }

            if (parsed.preset && layoutOptions.some((option) => option.id === parsed.preset)) {
                setLayoutPreset(parsed.preset);
            }
        } catch (error) {
            console.warn('Unable to read stored dashboard layout', error);
        }
    }, []);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const payload: StoredLayoutConfig = {
            preset: layoutPreset,
            order: customPanelOrder,
            visibility: customPanelVisibility
        };

        try {
            window.localStorage.setItem(layoutStorageKey, JSON.stringify(payload));
        } catch (error) {
            console.warn('Unable to persist dashboard layout', error);
        }
    }, [layoutPreset, customPanelOrder, customPanelVisibility]);

    const toggleDarkMode = () => {
        setIsDarkMode((previous) => (previous === null ? true : !previous));
    };

    const movePanel = React.useCallback((panelId: PrimaryPanelId, direction: 'up' | 'down') => {
        setCustomPanelOrder((previous) => {
            const currentIndex = previous.indexOf(panelId);
            if (currentIndex === -1) {
                return previous;
            }

            const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
            if (targetIndex < 0 || targetIndex >= previous.length) {
                return previous;
            }

            const next = [...previous];
            next.splice(currentIndex, 1);
            next.splice(targetIndex, 0, panelId);
            return next;
        });
    }, []);

    const handleTogglePanelVisibility = React.useCallback((panelId: PrimaryPanelId) => {
        setCustomPanelVisibility((previous) => {
            const isVisible = previous[panelId] !== false;
            if (isVisible) {
                const remainingVisible = primaryPanelIds.filter((id) => id !== panelId && previous[id] !== false).length;
                if (remainingVisible === 0) {
                    return previous;
                }
            }

            return { ...previous, [panelId]: !isVisible };
        });
    }, []);

    const handleResetLayout = React.useCallback(() => {
        setCustomPanelOrder([...panelLayoutPresets.earnings]);
        setCustomPanelVisibility(() =>
            primaryPanelIds.reduce(
                (accumulator, id) => {
                    accumulator[id] = true;
                    return accumulator;
                },
                {} as Record<PrimaryPanelId, boolean>
            )
        );
    }, []);

    const clientOptions = React.useMemo(
        () => clients.map((client) => ({ value: client.name, label: client.name })),
        []
    );

    const bookingFields = React.useMemo<QuickActionFormField[]>(
        () => [
            {
                id: 'client',
                label: 'Client',
                inputType: 'select',
                options: clientOptions,
                defaultValue: clientOptions[0]?.value ?? '',
                required: true
            },
            {
                id: 'shootType',
                label: 'Shoot type',
                inputType: 'text',
                placeholder: 'Editorial portraits',
                required: true
            },
            {
                id: 'date',
                label: 'Shoot date',
                inputType: 'date',
                defaultValue: dayjs().format('YYYY-MM-DD'),
                required: true
            },
            {
                id: 'startTime',
                label: 'Start time',
                inputType: 'time',
                defaultValue: '09:00',
                required: true
            },
            {
                id: 'endTime',
                label: 'End time',
                inputType: 'time',
                defaultValue: '11:00'
            },
            {
                id: 'location',
                label: 'Location',
                inputType: 'text',
                placeholder: 'Studio or on-site address',
                required: true
            },
            {
                id: 'status',
                label: 'Status',
                inputType: 'select',
                options: [
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Confirmed', label: 'Confirmed' },
                    { value: 'Editing', label: 'Editing' }
                ],
                defaultValue: 'Pending'
            }
        ],
        [clientOptions]
    );

    const galleryFields = React.useMemo<QuickActionFormField[]>(
        () => [
            {
                id: 'client',
                label: 'Client',
                inputType: 'select',
                options: clientOptions,
                defaultValue: clientOptions[0]?.value ?? '',
                required: true
            },
            {
                id: 'shootType',
                label: 'Gallery title',
                inputType: 'text',
                placeholder: 'Collection name',
                required: true
            },
            {
                id: 'status',
                label: 'Status',
                inputType: 'select',
                options: [
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Delivered', label: 'Delivered' }
                ],
                defaultValue: 'Pending'
            },
            {
                id: 'deliveryDueDate',
                label: 'Delivery due date',
                inputType: 'date',
                defaultValue: dayjs().add(7, 'day').format('YYYY-MM-DD')
            },
            {
                id: 'deliveredAt',
                label: 'Delivered on',
                inputType: 'date'
            },
            {
                id: 'coverImage',
                label: 'Cover image URL',
                inputType: 'url',
                placeholder: 'https://example.com/cover.jpg',
                helperText: 'Optional hero image shown in the gallery card.'
            }
        ],
        [clientOptions]
    );

    const closeModal = React.useCallback(() => {
        setActiveModal(null);
    }, []);

    const notify = React.useCallback((type: 'success' | 'error', message: string) => {
        setFeedback({ id: `${Date.now()}`, type, message });
    }, []);

    const createRecord = React.useCallback(
        async <T,>(resource: 'bookings' | 'invoices' | 'galleries', payload: Record<string, unknown>) => {
            const response = await fetch(`/api/crm/${resource}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            let result: { data?: T; error?: string } | null = null;
            try {
                result = await response.json();
            } catch (error) {
                // no-op; we'll handle below
            }

            if (!response.ok) {
                const message = result?.error ?? 'Unable to save record. Please try again.';
                throw new Error(message);
            }

            return (result?.data as T) ?? (payload as T);
        },
        []
    );

    const handleCreateBooking = React.useCallback(
        async (values: QuickActionModalSubmitValues) => {
            const clientName = (values.client as string) || clientOptions[0]?.value || 'New Client';
            const shootType = (values.shootType as string) || 'Photography Session';
            const shootDate = (values.date as string) || dayjs().format('YYYY-MM-DD');
            const startTime = formatTimeLabel(values.startTime) ?? '9:00 AM';
            const endTime = formatTimeLabel(values.endTime);
            const location = (values.location as string) || 'Studio TBD';
            const status = (values.status as BookingStatus) || 'Pending';

            const recordPayload: Record<string, unknown> = {
                client: clientName,
                shootType,
                date: shootDate,
                startTime,
                location,
                status,
                customFields: values.customFields
            };

            if (endTime) {
                recordPayload.endTime = endTime;
            }

            const created = await createRecord<BookingRecord>('bookings', recordPayload);
            setBookingList((previous) => [...previous, created]);
        },
        [clientOptions, createRecord]
    );

    const handleCreateInvoice = React.useCallback(
        async (values: InvoiceBuilderSubmitValues) => {
            const lineItems = values.lineItems.map((item, index) => ({
                id: item.id || `item-${index + 1}`,
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                total: Number(item.quantity) * Number(item.unitPrice)
            }));

            const recordPayload: Record<string, unknown> = {
                client: values.client,
                clientEmail: values.clientEmail,
                clientAddress: values.clientAddress,
                project: values.project,
                issueDate: values.issueDate,
                dueDate: values.dueDate,
                notes: values.notes,
                taxRate: values.taxRate,
                template: values.template,
                status: 'Sent',
                lineItems,
                sendEmail: values.sendEmail,
                generatePaymentLink: values.generatePaymentLink,
                customFields: values.customFields
            };

            const created = await createRecord<InvoiceRecord>('invoices', recordPayload);
            setInvoiceList((previous) => [...previous, created]);
        },
        [createRecord]
    );

    const handleUpdateInvoiceStatus = React.useCallback(
        async (id: string, status: InvoiceStatus) => {
            const original = invoiceList.find((invoice) => invoice.id === id);
            if (!original) {
                return;
            }

            setInvoiceList((previous) => previous.map((invoice) => (invoice.id === id ? { ...invoice, status } : invoice)));

            try {
                const response = await fetch(`/api/crm/invoices?id=${encodeURIComponent(id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });

                if (!response.ok) {
                    throw new Error('Unable to update invoice status.');
                }

                const payload = (await response.json()) as { data?: InvoiceRecord } | undefined;
                if (payload?.data) {
                    setInvoiceList((previous) =>
                        previous.map((invoice) => (invoice.id === id ? { ...invoice, ...payload.data } : invoice))
                    );
                }
            } catch (updateError) {
                console.error('Invoice status update failed', updateError);
                setInvoiceList((previous) =>
                    previous.map((invoice) => (invoice.id === id ? original : invoice))
                );
            }
        },
        [invoiceList]
    );

    const handleGenerateInvoicePdf = React.useCallback(
        async (invoice: InvoiceRecord) => {
            if (!invoice) {
                return;
            }

            setPdfInvoiceId(invoice.id);

            try {
                const token = await identity.getToken();
                if (!token) {
                    throw new Error('Authentication expired. Sign in again to generate invoices.');
                }

                const response = await fetch('/.netlify/functions/generate-invoice-pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        invoice,
                        studio: {
                            name: 'Codex Studio',
                            email: 'billing@codex.studio',
                            phone: '+1 (555) 123-4567',
                            website: 'https://codex.studio'
                        }
                    })
                });

                if (!response.ok) {
                    const payload = await readJsonSafely<{ error?: string }>(response);
                    throw new Error(payload?.error ?? 'Failed to generate the invoice PDF.');
                }

                if (typeof window !== 'undefined') {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = window.document.createElement('a');
                    link.href = url;
                    link.download = `invoice-${invoice.id}.pdf`;
                    window.document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                }

                notify('success', `Invoice ${invoice.id} PDF generated.`);
            } catch (error) {
                console.error('Invoice PDF generation failed', error);
                notify('error', error instanceof Error ? error.message : 'Unable to generate the PDF invoice.');
            } finally {
                setPdfInvoiceId(null);
            }
        },
        [identity, notify]
    );

    const handleCreateCheckoutSession = React.useCallback(
        async (invoice: InvoiceRecord) => {
            if (!invoice) {
                return;
            }

            setCheckoutInvoiceId(invoice.id);

            try {
                const token = await identity.getToken();
                if (!token) {
                    throw new Error('Authentication expired. Sign in again to create payment links.');
                }

                const origin = typeof window !== 'undefined' ? window.location.origin : 'https://codex.studio';
                const response = await fetch('/.netlify/functions/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        invoice,
                        successUrl: `${origin}/crm?checkout=success`,
                        cancelUrl: `${origin}/crm?checkout=cancel`
                    })
                });

                const payload = await readJsonSafely<{ url?: string; error?: string }>(response);

                if (!response.ok) {
                    throw new Error(payload?.error ?? 'Unable to start a Stripe checkout session.');
                }

                const checkoutUrl = payload?.url;
                if (!checkoutUrl) {
                    throw new Error('Stripe did not return a checkout URL.');
                }

                if (typeof window !== 'undefined') {
                    window.open(checkoutUrl, '_blank', 'noopener');
                }

                setInvoiceList((previous) =>
                    previous.map((record) => (record.id === invoice.id ? { ...record, paymentLink: checkoutUrl } : record))
                );

                notify('success', `Payment link created for invoice ${invoice.id}.`);
            } catch (error) {
                console.error('Stripe checkout session failed', error);
                notify('error', error instanceof Error ? error.message : 'Unable to start a Stripe checkout session.');
            } finally {
                setCheckoutInvoiceId(null);
            }
        },
        [identity, notify]
    );

    const handleCreateGallery = React.useCallback(
        async (values: QuickActionModalSubmitValues) => {
            const clientName = (values.client as string) || clientOptions[0]?.value || 'New Client';
            const shootType = (values.shootType as string) || 'New Collection';
            const status = (values.status as GalleryStatus) || 'Pending';
            const deliveryDueDate = values.deliveryDueDate as string | undefined;
            const deliveredAt = values.deliveredAt as string | undefined;
            const coverImage = values.coverImage as string | undefined;

            const recordPayload: Record<string, unknown> = {
                client: clientName,
                shootType,
                status,
                customFields: values.customFields
            };

            if (deliveryDueDate) {
                recordPayload.deliveryDueDate = deliveryDueDate;
            }

            if (status === 'Delivered') {
                recordPayload.deliveredAt = deliveredAt || deliveryDueDate || dayjs().format('YYYY-MM-DD');
            }

            if (coverImage) {
                recordPayload.coverImage = coverImage;
            }

            const created = await createRecord<GalleryRecord>('galleries', recordPayload);
            setGalleryList((previous) => [...previous, created]);
        },
        [clientOptions, createRecord]
    );

    const sortedInvoices = React.useMemo(
        () =>
            invoiceList
                .slice()
                .sort((first, second) => dayjs(first.dueDate).valueOf() - dayjs(second.dueDate).valueOf()),
        [invoiceList]
    );

    const currentMonth = sortedInvoices.length
        ? dayjs(sortedInvoices[sortedInvoices.length - 1].dueDate).startOf('month')
        : dayjs().startOf('month');
    const previousMonth = currentMonth.subtract(1, 'month');

    const revenueThisMonth = sumInvoicesForMonth(invoiceList, currentMonth);
    const revenuePreviousMonth = sumInvoicesForMonth(invoiceList, previousMonth);
    const revenueChange = calculatePercentChange(revenueThisMonth, revenuePreviousMonth);

    const activeBookingStatuses: BookingStatus[] = ['Confirmed', 'Pending'];

    const upcomingShootsCurrent = bookingList.filter(
        (booking) => activeBookingStatuses.includes(booking.status) && dayjs(booking.date).isSame(currentMonth, 'month')
    ).length;
    const upcomingShootsPrevious = bookingList.filter(
        (booking) => activeBookingStatuses.includes(booking.status) && dayjs(booking.date).isSame(previousMonth, 'month')
    ).length;
    const upcomingChange = calculatePercentChange(upcomingShootsCurrent, upcomingShootsPrevious);

    const outstandingAmountCurrent = invoiceList
        .filter((invoice) => invoice.status !== 'Paid' && dayjs(invoice.dueDate).isSame(currentMonth, 'month'))
        .reduce((total, invoice) => total + invoice.amount, 0);
    const outstandingAmountPrevious = invoiceList
        .filter((invoice) => invoice.status !== 'Paid' && dayjs(invoice.dueDate).isSame(previousMonth, 'month'))
        .reduce((total, invoice) => total + invoice.amount, 0);
    const outstandingChange = calculatePercentChange(outstandingAmountCurrent, outstandingAmountPrevious);

    const statCards = [
        {
            id: 'revenue',
            title: 'Revenue This Month',
            value: formatCurrency(revenueThisMonth),
            change: revenueChange,
            changeLabel: 'vs previous month',
            icon: <InvoiceIcon className="h-5 w-5" />
        },
        {
            id: 'shoots',
            title: 'Upcoming Shoots',
            value: `${upcomingShootsCurrent}`,
            change: upcomingChange,
            changeLabel: 'vs previous month',
            icon: <CalendarIcon className="h-5 w-5" />
        },
        {
            id: 'outstanding',
            title: 'Outstanding Invoices',
            value: formatCurrency(outstandingAmountCurrent),
            change: outstandingChange,
            changeLabel: 'vs previous month',
            icon: <GalleryIcon className="h-5 w-5" />
        }
    ];

    const upcomingBookings = React.useMemo(
        () =>
            bookingList
                .filter(
                    (booking) =>
                        activeBookingStatuses.includes(booking.status) &&
                        (dayjs(booking.date).isSame(currentMonth, 'month') || dayjs(booking.date).isAfter(currentMonth))
                )
                .sort((first, second) => dayjs(first.date).valueOf() - dayjs(second.date).valueOf())
                .slice(0, 5),
        [bookingList, currentMonth]
    );

    const openInvoices = React.useMemo(
        () =>
            invoiceList
                .filter((invoice) => invoice.status !== 'Paid')
                .sort((first, second) => dayjs(first.dueDate).valueOf() - dayjs(second.dueDate).valueOf()),
        [invoiceList]
    );

    const analyticsData = React.useMemo(
        () => buildAnalytics(currentMonth, bookingList, invoiceList),
        [bookingList, currentMonth, invoiceList]
    );

    const panelOrder = React.useMemo(() => {
        if (layoutPreset === 'custom') {
            return customPanelOrder;
        }
        return panelLayoutPresets[layoutPreset];
    }, [layoutPreset, customPanelOrder]);

    const panelsToRender = React.useMemo(
        () =>
            panelOrder.filter((panelId, index, self) => {
                if (self.indexOf(panelId) !== index) {
                    return false;
                }

                if (layoutPreset === 'custom') {
                    return customPanelVisibility[panelId] !== false;
                }

                return true;
            }),
        [panelOrder, layoutPreset, customPanelVisibility]
    );

    const activeLayoutDescription = React.useMemo(() => {
        const match = layoutOptions.find((option) => option.id === layoutPreset);
        return match?.description ?? '';
    }, [layoutPreset]);

    const deliveredGalleries = galleryList.filter((gallery) => gallery.status === 'Delivered').length;
    const pendingGalleries = galleryList.length - deliveredGalleries;
    const galleryCompletion = galleryList.length
        ? Math.round((deliveredGalleries / galleryList.length) * 100)
        : 0;
    const pendingGalleryClients = galleryList
        .filter((gallery) => gallery.status === 'Pending')
        .map((gallery) => gallery.client);

    const totalClients = clients.filter((client) => client.status !== 'Archived').length;
    const shootsThisYear = bookingList.filter((booking) => dayjs(booking.date).year() === currentMonth.year()).length;
    const outstandingInvoiceCount = openInvoices.length;

    const paidRevenue = invoiceList
        .filter((invoice) => invoice.status === 'Paid')
        .reduce((total, invoice) => total + invoice.amount, 0);
    const earningsGoal = 85000;
    const earningsProgress = Math.min(paidRevenue / earningsGoal, 1);
    const earningsPercentage = Math.round(earningsProgress * 100);
    const earningsRemaining = Math.max(earningsGoal - paidRevenue, 0);

    const profileStats = [
        { id: 'clients', label: 'Active clients', value: totalClients.toString() },
        { id: 'shoots', label: 'Shoots this year', value: shootsThisYear.toString() },
        { id: 'invoices', label: 'Outstanding invoices', value: outstandingInvoiceCount.toString() }
    ];

    const primaryPanelDefinitions = React.useMemo(
        () => ({
            earnings: {
                title: 'Earnings metrics',
                description: 'Revenue pulse, goal progress, and cashflow trajectory.',
                className: 'w-full xl:col-span-2',
                render: () => (
                    <EarningsSummaryCard
                        data={analyticsData.monthly}
                        monthlyRevenue={revenueThisMonth}
                        revenueChange={revenueChange}
                        yearToDateRevenue={paidRevenue}
                        annualGoal={earningsGoal}
                    />
                )
            },
            overview: {
                title: 'Studio overview',
                description: 'Shoots scheduled and revenue performance across time horizons.',
                className: 'w-full xl:col-span-2',
                render: () => <OverviewChart data={analyticsData} />
            },
            profile: {
                title: 'Team & galleries',
                description: 'Client milestones, gallery delivery momentum, and yearly goals.',
                className: 'w-full xl:col-span-1',
                render: () => (
                    <ProfileHighlights
                        profileStats={profileStats}
                        earningsPercentage={earningsPercentage}
                        paidRevenue={paidRevenue}
                        earningsGoal={earningsGoal}
                        earningsRemaining={earningsRemaining}
                        deliveredGalleries={deliveredGalleries}
                        pendingGalleries={pendingGalleries}
                        galleryCompletion={galleryCompletion}
                        pendingGalleryClients={pendingGalleryClients}
                    />
                )
            }
        }),
        [
            analyticsData,
            revenueThisMonth,
            revenueChange,
            paidRevenue,
            earningsGoal,
            profileStats,
            earningsPercentage,
            earningsRemaining,
            deliveredGalleries,
            pendingGalleries,
            galleryCompletion,
            pendingGalleryClients
        ]
    );

    const topClientsByRevenue = React.useMemo(
        () => {
            const revenueByClient = new Map<
                string,
                { total: number; projects: number; lastInvoiceDate?: string; statusLabel: string }
            >();

            invoiceList.forEach((invoice) => {
                const existing = revenueByClient.get(invoice.client);
                const clientDetails = clients.find((client) => client.name === invoice.client);

                if (existing) {
                    existing.total += invoice.amount;
                    existing.projects += 1;

                    if (!existing.lastInvoiceDate || dayjs(invoice.dueDate).isAfter(dayjs(existing.lastInvoiceDate))) {
                        existing.lastInvoiceDate = invoice.dueDate;
                    }
                } else {
                    revenueByClient.set(invoice.client, {
                        total: invoice.amount,
                        projects: 1,
                        lastInvoiceDate: invoice.dueDate,
                        statusLabel: clientDetails ? clientDetails.status : 'Past Client'
                    });
                }
            });

            return Array.from(revenueByClient.entries())
                .map(([name, data]) => ({
                    name,
                    total: data.total,
                    projects: data.projects,
                    statusLabel: data.statusLabel,
                    lastInvoiceLabel: data.lastInvoiceDate
                        ? dayjs(data.lastInvoiceDate).format('MMM D, YYYY')
                        : undefined
                }))
                .sort((first, second) => second.total - first.total)
                .slice(0, 4);
        },
        [invoiceList]
    );

    const upcomingShootReminders = React.useMemo(
        () => {
            const referenceDate = currentMonth.startOf('day');

            return bookingList
                .filter((booking) => activeBookingStatuses.includes(booking.status))
                .filter((booking) => {
                    const bookingDate = dayjs(booking.date);
                    return bookingDate.isSame(referenceDate, 'day') || bookingDate.isAfter(referenceDate);
                })
                .sort((first, second) => dayjs(first.date).valueOf() - dayjs(second.date).valueOf())
                .slice(0, 4)
                .map((booking) => {
                    const bookingDate = dayjs(booking.date);
                    return {
                        ...booking,
                        dateLabel: bookingDate.format('MMM D'),
                        daysUntil: bookingDate.startOf('day').diff(referenceDate, 'day')
                    };
                });
        },
        [bookingList, currentMonth]
    );

    const galleryLifecycleAlerts = React.useMemo(() => {
        type AlertTone = 'danger' | 'warning' | 'info' | 'muted';
        type GalleryAlert = {
            id: string;
            client: string;
            shootType: string;
            projectId?: string;
            eventType: 'delivery' | 'expiration';
            eventDate: string;
            eventDateLabel: string;
            countdownLabel: string;
            tone: AlertTone;
            reminderSentLabel?: string;
        };

        const referenceDate = dayjs().startOf('day');
        const expirationWarningThreshold = 30;

        return galleryList
            .flatMap<GalleryAlert>((gallery) => {
                const alerts: GalleryAlert[] = [];

                if (gallery.status === 'Pending' && gallery.deliveryDueDate) {
                    const dueDate = dayjs(gallery.deliveryDueDate);

                    if (dueDate.isValid()) {
                        const daysRemaining = dueDate.startOf('day').diff(referenceDate, 'day');
                        let tone: AlertTone = 'info';

                        if (daysRemaining < 0) {
                            tone = 'danger';
                        } else if (daysRemaining <= 3) {
                            tone = 'warning';
                        }

                        const countdownLabel =
                            daysRemaining < 0
                                ? `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}`
                                : daysRemaining === 0
                                  ? 'Due today'
                                  : daysRemaining === 1
                                    ? 'Due tomorrow'
                                    : `Due in ${daysRemaining} days`;

                        alerts.push({
                            id: `${gallery.id}-delivery`,
                            client: gallery.client,
                            shootType: gallery.shootType,
                            projectId: gallery.projectId,
                            eventType: 'delivery',
                            eventDate: dueDate.toISOString(),
                            eventDateLabel: dueDate.format('MMM D, YYYY'),
                            countdownLabel,
                            tone
                        });
                    }
                }

                if (gallery.status === 'Delivered' && gallery.expiresAt) {
                    const expiresAt = dayjs(gallery.expiresAt);

                    if (expiresAt.isValid()) {
                        const daysRemaining = expiresAt.startOf('day').diff(referenceDate, 'day');
                        let tone: AlertTone = 'muted';

                        if (daysRemaining < 0) {
                            tone = 'danger';
                        } else if (daysRemaining <= expirationWarningThreshold) {
                            tone = 'warning';
                        }

                        const countdownLabel =
                            daysRemaining < 0
                                ? `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago`
                                : daysRemaining === 0
                                  ? 'Expires today'
                                  : daysRemaining === 1
                                    ? 'Expires tomorrow'
                                    : `Expires in ${daysRemaining} days`;

                        alerts.push({
                            id: `${gallery.id}-expiration`,
                            client: gallery.client,
                            shootType: gallery.shootType,
                            projectId: gallery.projectId,
                            eventType: 'expiration',
                            eventDate: expiresAt.toISOString(),
                            eventDateLabel: expiresAt.format('MMM D, YYYY'),
                            countdownLabel,
                            tone,
                            reminderSentLabel: gallery.reminderSentAt
                                ? dayjs(gallery.reminderSentAt).format('MMM D, YYYY')
                                : undefined
                        });
                    }
                }

                return alerts;
            })
            .sort((first, second) => dayjs(first.eventDate).valueOf() - dayjs(second.eventDate).valueOf());
    }, [galleryList]);

    const galleryLifecycleToneClass: Record<'danger' | 'warning' | 'info' | 'muted', string> = {
        danger: 'text-[#D61B7B] dark:text-[#FF9FD8]',
        warning: 'text-amber-600 dark:text-amber-300',
        info: 'text-[#0F9BD7] dark:text-[#63E8FF]',
        muted: 'text-slate-500 dark:text-slate-400'
    };

    return (
        <>
            <Head>
                <title>APERTURE Studio CRM Dashboard</title>
                <meta
                    name="description"
                    content="Aperture Studio CRM dashboard with earnings insights, revenue graphs, and a customizable workspace."
                />
            </Head>
            <div className="min-h-screen bg-slate-100 transition-colors dark:bg-slate-950">
                <div className="flex min-h-screen">
                    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-slate-950 text-slate-100 shadow-lg lg:flex dark:border-slate-900">
                        <div className="flex h-16 items-center px-6">
                            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Navigation</span>
                        </div>
                        <nav className="flex flex-1 flex-col gap-1 px-4 py-4">
                            {navigationItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={[
                                        'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                                        item.isActive
                                            ? 'bg-slate-900/80 text-white shadow-inner'
                                            : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
                                    ].join(' ')}
                                >
                                    <span className="inline-flex h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                        <div className="px-6 pb-8">
                            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-xs text-slate-400 shadow-lg">
                                <ApertureMark
                                    className="mt-0.5 h-7 w-7 text-white/90"
                                    title="Aperture Studio brand insignia"
                                />
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.48em] text-slate-300">
                                        Aperture Studio
                                    </p>
                                    <p className="mt-2 leading-relaxed text-slate-400">
                                        Calibrate layouts, earnings insights, and production workflows inside your branded CRM hub.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </aside>
                    <div className="flex min-h-screen flex-1 flex-col">
                        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900/80">
                            <div className="flex items-center gap-3 py-1">
                                <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-white/10">
                                    <ApertureMark
                                        className="h-7 w-7 text-slate-900 drop-shadow-sm dark:text-white/90"
                                        title="Aperture Studio brand mark"
                                    />
                                </span>
                                <div className="leading-tight">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.64em] text-[#4534FF] dark:text-[#9DAAFF]">
                                        APERTURE
                                    </p>
                                    <p className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                                        Studio CRM
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={toggleDarkMode}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                                    aria-label={isDarkMode ? 'Activate light mode' : 'Activate dark mode'}
                                >
                                    {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                                </button>
                                <button
                                    type="button"
                                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                                    aria-label="Open notifications"
                                >
                                    <BellIcon className="h-5 w-5" />
                                    <span className="absolute right-2 top-2 inline-flex h-2 w-2 rounded-full bg-[#F45DC8]"></span>
                                </button>
                                <div className="relative" ref={userMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsUserMenuOpen((open) => !open)}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 pl-1 pr-3 text-sm font-medium text-slate-700 shadow-sm transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-white"
                                        aria-haspopup="menu"
                                        aria-expanded={isUserMenuOpen}
                                    >
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] text-sm font-semibold text-white shadow-sm">
                                            AL
                                        </span>
                                        <span className="hidden text-left sm:block">
                                            <span className="block text-xs text-slate-500 dark:text-slate-400">Photographer</span>
                                            <span className="block font-semibold">Avery Logan</span>
                                        </span>
                                        <ChevronDownIcon className={`h-4 w-4 transition ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isUserMenuOpen && (
                                        <div className="absolute right-0 mt-3 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                            <button className="block w-full px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                                                Profile
                                            </button>
                                            <button
                                                onClick={() => {
                                                    identity.logout();
                                                    setIsUserMenuOpen(false);
                                                }}
                                                className="block w-full px-4 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </header>
                        <main className="flex-1 bg-slate-50 pb-16 transition-colors dark:bg-slate-950">
                            <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pt-10">
                                <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold uppercase tracking-widest text-[#4534FF] dark:text-[#9DAAFF]">
                                            Command Dashboard
                                        </p>
                                        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
                                            APERTURE Studio CRM
                                        </h1>
                                        <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">
                                            Guide your studio with the earnings-first dashboard you loved—now paired with customizable layout presets, real-time revenue graphs, and workflow automation accents.
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-start gap-4 lg:items-end">
                                        <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
                                            <div className="inline-flex shrink-0 rounded-full border border-slate-200 bg-white/90 p-1 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                                                {layoutOptions.map((option) => {
                                                    const isActive = layoutPreset === option.id;
                                                    return (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            onClick={() => setLayoutPreset(option.id)}
                                                            aria-pressed={isActive}
                                                            className={[
                                                                'rounded-full px-3 py-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4DE5FF] dark:focus-visible:ring-offset-slate-900',
                                                                isActive
                                                                    ? 'bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] text-white shadow-sm'
                                                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                                            ].join(' ')}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {quickActions.map((action) => (
                                                    <button
                                                        key={action.id}
                                                        type="button"
                                                        onClick={() => setActiveModal(action.modal)}
                                                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4DE5FF] dark:focus-visible:ring-offset-slate-900"
                                                    >
                                                        {action.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {activeLayoutDescription ? (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 lg:text-right">
                                                {activeLayoutDescription}
                                            </p>
                                        ) : null}
                                    </div>
                                </header>

                                {layoutPreset === 'custom' ? (
                                    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm transition dark:border-slate-800 dark:bg-slate-900">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Customize your overview</h2>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    Toggle modules and reorder them to craft a layout that matches your studio workflow.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleResetLayout}
                                                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-[#5D3BFF] hover:text-[#5D3BFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4DE5FF] focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-300 dark:hover:border-[#4DE5FF] dark:hover:text-[#4DE5FF] dark:focus-visible:ring-offset-slate-900"
                                            >
                                                Reset layout
                                            </button>
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            {customPanelOrder.map((panelId, index) => {
                                                const definition = primaryPanelDefinitions[panelId];
                                                const isVisible = customPanelVisibility[panelId] !== false;
                                                const canMoveUp = index > 0;
                                                const canMoveDown = index < customPanelOrder.length - 1;

                                                return (
                                                    <div
                                                        key={panelId}
                                                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm transition hover:border-[#5D3BFF] hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-[#4DE5FF] sm:flex-row sm:items-center sm:justify-between"
                                                    >
                                                        <div className="space-y-2">
                                                            <label className="flex items-center gap-3 text-slate-900 dark:text-white">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isVisible}
                                                                    onChange={() => handleTogglePanelVisibility(panelId)}
                                                                    className="h-4 w-4 rounded border-slate-300 text-[#5D3BFF] focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-600"
                                                                />
                                                                <span className="font-semibold">{definition.title}</span>
                                                            </label>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 sm:ml-7">{definition.description}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 sm:pl-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => movePanel(panelId, 'up')}
                                                                disabled={!canMoveUp}
                                                                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:border-[#5D3BFF] hover:text-[#5D3BFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4DE5FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-[#4DE5FF] dark:hover:text-[#4DE5FF] dark:focus-visible:ring-offset-slate-900 dark:disabled:border-slate-800 dark:disabled:text-slate-600"
                                                            >
                                                                Move up
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => movePanel(panelId, 'down')}
                                                                disabled={!canMoveDown}
                                                                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:border-[#5D3BFF] hover:text-[#5D3BFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4DE5FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-[#4DE5FF] dark:hover:text-[#4DE5FF] dark:focus-visible:ring-offset-slate-900 dark:disabled:border-slate-800 dark:disabled:text-slate-600"
                                                            >
                                                                Move down
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ) : null}

                                <AnimatePresence>
                                    {feedback ? (
                                        <motion.div
                                            key={feedback.id}
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm shadow-sm transition-all ${
                                                feedback.type === 'success'
                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                                                    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
                                            }`}
                                        >
                                            <span
                                                className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold ${
                                                    feedback.type === 'success'
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-200'
                                                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-200'
                                                }`}
                                                aria-hidden="true"
                                            >
                                                {feedback.type === 'success' ? '✓' : '!'}
                                            </span>
                                            <div className="flex-1">
                                                <p className="font-semibold">
                                                    {feedback.type === 'success' ? 'Action complete' : 'Action required'}
                                                </p>
                                                <p className="mt-1 leading-relaxed">{feedback.message}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFeedback(null)}
                                                className="ml-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                            >
                                                Close
                                            </button>
                                        </motion.div>
                                    ) : null}
                                </AnimatePresence>

                                <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                                    {statCards.map((card) => (
                                        <StatCard
                                            key={card.id}
                                            title={card.title}
                                            value={card.value}
                                            change={card.change}
                                            changeLabel={card.changeLabel}
                                            icon={card.icon}
                                        />
                                    ))}
                                </section>

                                <div className="grid gap-6 xl:grid-cols-3">
                                    {panelsToRender.map((panelId) => {
                                        const panel = primaryPanelDefinitions[panelId];
                                        return (
                                            <div key={panelId} className={panel.className}>
                                                {panel.render()}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="grid gap-6 lg:grid-cols-3">
                                <div className="space-y-6 lg:col-span-2">
                                    <SectionCard
                                        title="Upcoming Shoots"
                                        description="Stay ready for every session with a quick view of the week ahead."
                                        action={
                                            <Link
                                                href="/bookings"
                                                className="text-sm font-semibold text-[#4534FF] transition hover:text-[#5E6CFF] dark:text-[#9DAAFF] dark:hover:text-[#B8C5FF]"
                                            >
                                                Open calendar
                                            </Link>
                                        }
                                    >
                                        <BookingList bookings={upcomingBookings} />
                                    </SectionCard>

                                    <SectionCard
                                        title="Active Clients"
                                        description="From loyal regulars to new leads, see who needs attention next."
                                        action={
                                            <Link
                                                href="/clients"
                                                className="text-sm font-semibold text-[#4534FF] transition hover:text-[#5E6CFF] dark:text-[#9DAAFF] dark:hover:text-[#B8C5FF]"
                                            >
                                                View all clients
                                            </Link>
                                        }
                                    >
                                        <ClientTable clients={clients} />
                                    </SectionCard>
                                </div>
                                <div className="space-y-6">
                                    <SectionCard
                                        title="Open Invoices"
                                        description="Collect payments faster with a focused list of outstanding balances."
                                        action={
                                            <Link
                                                href="/invoices"
                                                className="text-sm font-semibold text-[#4534FF] transition hover:text-[#5E6CFF] dark:text-[#9DAAFF] dark:hover:text-[#B8C5FF]"
                                            >
                                                View all invoices
                                            </Link>
                                        }
                                    >
                                        <InvoiceTable
                                            invoices={openInvoices}
                                                onUpdateStatus={handleUpdateInvoiceStatus}
                                                onGeneratePdf={handleGenerateInvoicePdf}
                                                onCreateCheckout={handleCreateCheckoutSession}
                                                generatingInvoiceId={pdfInvoiceId}
                                                checkoutInvoiceId={checkoutInvoiceId}
                                            />
                                        </SectionCard>

                                        <SectionCard
                                            title="Studio Tasks"
                                            description="Keep production moving with next actions across your team."
                                            action={
                                                <button className="text-sm font-semibold text-[#4534FF] transition hover:text-[#5E6CFF] dark:text-[#9DAAFF] dark:hover:text-[#B8C5FF]">
                                                    Create task
                                                </button>
                                            }
                                        >
                                            <TaskList tasks={tasks} />
                                        </SectionCard>
                                    </div>
                                </div>

                                <div className="grid gap-6 lg:grid-cols-3">
                                    <SectionCard
                                        title="Top Clients by Revenue"
                                        description="Spot the relationships fueling your studio's growth."
                                    >
                                        {topClientsByRevenue.length > 0 ? (
                                            <ul className="space-y-4">
                                                {topClientsByRevenue.map((client) => (
                                                    <li key={client.name} className="flex items-center justify-between gap-4">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                {client.name}
                                                            </p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                {client.statusLabel} · {client.projects}{' '}
                                                                {client.projects === 1 ? 'project' : 'projects'}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                {formatCurrency(client.total)}
                                                            </p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                {client.lastInvoiceLabel
                                                                    ? `Last invoice ${client.lastInvoiceLabel}`
                                                                    : 'No invoices yet'}
                                                            </p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-slate-500 dark:text-slate-400">No invoice data yet.</p>
                                        )}
                                    </SectionCard>

                                    <SectionCard
                                        title="Upcoming Shoot Reminders"
                                        description="Prep details for the next client milestones."
                                    >
                                        {upcomingShootReminders.length > 0 ? (
                                            <ul className="space-y-4">
                                                {upcomingShootReminders.map((reminder) => (
                                                    <li
                                                        key={reminder.id}
                                                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                    {reminder.client}
                                                                </p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                    {reminder.shootType}
                                                                </p>
                                                            </div>
                                                            <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                    {reminder.dateLabel}
                                                                </p>
                                                                <p>{reminder.startTime}</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                                                            <span
                                                                className={[
                                                                    'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold',
                                                                    reminder.daysUntil <= 3
                                                                        ? 'bg-[#FFE6F5] text-[#D61B7B] dark:bg-[#4D1331] dark:text-[#FF9FD8]'
                                                                        : 'bg-[#E9E7FF] text-[#4534FF] dark:bg-[#2A1F67] dark:text-[#AEB1FF]'
                                                                ].join(' ')}
                                                            >
                                                                {formatDaysUntil(reminder.daysUntil)}
                                                            </span>
                                                            <span className="text-slate-500 dark:text-slate-400">{reminder.location}</span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                No upcoming shoots scheduled.
                                            </p>
                                        )}
                                    </SectionCard>

                                    <SectionCard
                                        title="Gallery Delivery &amp; Expiration"
                                        description="Keep post-production commitments on schedule and alert clients before galleries expire."
                                    >
                                        {galleryLifecycleAlerts.length > 0 ? (
                                            <ul className="space-y-4">
                                                {galleryLifecycleAlerts.map((alert) => {
                                                    const toneClass = galleryLifecycleToneClass[alert.tone];
                                                    const badgeClass = [
                                                        'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold',
                                                        alert.eventType === 'delivery'
                                                            ? 'bg-indigo-100/80 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200'
                                                            : alert.tone === 'danger'
                                                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                                                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
                                                    ].join(' ');

                                                    return (
                                                        <li
                                                            key={alert.id}
                                                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                                        >
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div>
                                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                        {alert.client}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                        {alert.shootType}
                                                                    </p>
                                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                                                        <span className={badgeClass}>
                                                                            {alert.eventType === 'delivery' ? 'Delivery' : 'Expiration'}
                                                                        </span>
                                                                        {alert.projectId ? (
                                                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                                                                {alert.projectId}
                                                                            </span>
                                                                        ) : null}
                                                                        {alert.eventType === 'expiration' && alert.reminderSentLabel ? (
                                                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                                                                Reminder sent {alert.reminderSentLabel}
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right text-xs">
                                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                        {alert.eventDateLabel}
                                                                    </p>
                                                                    <p className={['font-semibold', toneClass].join(' ')}>{alert.countdownLabel}</p>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                No upcoming deliveries or expirations.
                                            </p>
                                        )}
                                    </SectionCard>
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </div>
            <AnimatePresence mode="wait">
                {activeModal === 'booking' ? (
                    <QuickActionModal
                        key="booking"
                        type="booking"
                        title="Schedule a new shoot"
                        subtitle="Turn a client request into a confirmed production timeline with quick context fields."
                        submitLabel="Save booking"
                        onClose={closeModal}
                        onSubmit={handleCreateBooking}
                        baseFields={bookingFields}
                    />
                ) : null}
                {activeModal === 'invoice' ? (
                    <InvoiceBuilderModal clients={clients} onClose={closeModal} onSubmit={handleCreateInvoice} />
                ) : null}
                {activeModal === 'gallery' ? (
                    <QuickActionModal
                        key="gallery"
                        type="gallery"
                        title="Upload gallery details"
                        subtitle="Log delivery milestones, passwords, and presentation assets before sharing with clients."
                        submitLabel="Save gallery"
                        onClose={closeModal}
                        onSubmit={handleCreateGallery}
                        baseFields={galleryFields}
                    />
                ) : null}
            </AnimatePresence>
        </>
    );
}


export default function PhotographyCrmDashboardPage(props: PhotographyCrmDashboardProps) {
    return (
        <CrmAuthGuard
            title="Studio CRM access"
            description="Authenticate with the studio access code to view client data, galleries, and billing activity."
        >
            <PhotographyCrmDashboard {...props} />
        </CrmAuthGuard>
    );
}


export const getStaticProps: GetStaticProps<PhotographyCrmDashboardProps> = async () => {
    const [bookings, invoices] = await Promise.all([
        readCmsCollection<BookingRecord>('crm-bookings.json'),
        readCmsCollection<InvoiceRecord>('crm-invoices.json')
    ]);

    return {
        props: {
            bookings,
            invoices
        }
    };
};

async function readJsonSafely<T>(response: Response): Promise<T | null> {
    try {
        const raw = await response.text();
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as T;
    } catch (error) {
        console.warn('Unable to parse JSON response payload', error);
        return null;
    }
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
});

function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}

function calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) {
        return current === 0 ? 0 : 100;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
}

function sumInvoicesForMonth(invoices: InvoiceRecord[], month: dayjs.Dayjs): number {
    return invoices
        .filter((invoice) => dayjs(invoice.dueDate).isSame(month, 'month'))
        .reduce((total, invoice) => total + invoice.amount, 0);
}

function formatTimeLabel(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    const parsed = dayjs(trimmed, ['HH:mm', 'H:mm', 'h:mm A', 'h:mmA'], true);
    if (parsed.isValid()) {
        return parsed.format('h:mm A');
    }

    return trimmed;
}

function startOfWeek(value: dayjs.Dayjs): dayjs.Dayjs {
    return value.subtract(value.day(), 'day').startOf('day');
}

function endOfWeek(value: dayjs.Dayjs): dayjs.Dayjs {
    return startOfWeek(value).add(6, 'day').endOf('day');
}

function isWithinRange(value: dayjs.Dayjs, start: dayjs.Dayjs, end: dayjs.Dayjs): boolean {
    return (value.isAfter(start) || value.isSame(start)) && (value.isBefore(end) || value.isSame(end));
}

function buildAnalytics(
    referenceMonth: dayjs.Dayjs,
    bookings: BookingRecord[],
    invoices: InvoiceRecord[]
): Record<'weekly' | 'monthly' | 'yearly', ChartPoint[]> {
    return {
        weekly: buildWeeklyAnalytics(referenceMonth, bookings, invoices),
        monthly: buildMonthlyAnalytics(referenceMonth, bookings, invoices),
        yearly: buildYearlyAnalytics(referenceMonth, bookings, invoices)
    };
}

function buildWeeklyAnalytics(
    referenceMonth: dayjs.Dayjs,
    bookings: BookingRecord[],
    invoices: InvoiceRecord[]
): ChartPoint[] {
    const weeksToDisplay = 6;
    const result: ChartPoint[] = [];
    const referenceEnd = referenceMonth.endOf('month');

    for (let offset = weeksToDisplay - 1; offset >= 0; offset -= 1) {
        const anchor = referenceEnd.subtract(offset, 'week');
        const weekStart = startOfWeek(anchor);
        const weekEnd = endOfWeek(anchor);

        const shoots = bookings.filter((booking) => isWithinRange(dayjs(booking.date), weekStart, weekEnd)).length;
        const revenue = invoices
            .filter((invoice) => isWithinRange(dayjs(invoice.dueDate), weekStart, weekEnd))
            .reduce((total, invoice) => total + invoice.amount, 0);

        result.push({
            label: weekStart.format('MMM D'),
            shoots,
            revenue
        });
    }

    return result;
}

function buildMonthlyAnalytics(
    referenceMonth: dayjs.Dayjs,
    bookings: BookingRecord[],
    invoices: InvoiceRecord[]
): ChartPoint[] {
    const monthsToDisplay = 6;
    const result: ChartPoint[] = [];

    for (let offset = monthsToDisplay - 1; offset >= 0; offset -= 1) {
        const month = referenceMonth.subtract(offset, 'month');
        const shoots = bookings.filter((booking) => dayjs(booking.date).isSame(month, 'month')).length;
        const revenue = invoices
            .filter((invoice) => dayjs(invoice.dueDate).isSame(month, 'month'))
            .reduce((total, invoice) => total + invoice.amount, 0);

        result.push({
            label: month.format('MMM'),
            shoots,
            revenue
        });
    }

    return result;
}

function buildYearlyAnalytics(
    referenceMonth: dayjs.Dayjs,
    bookings: BookingRecord[],
    invoices: InvoiceRecord[]
): ChartPoint[] {
    const yearsToDisplay = 3;
    const result: ChartPoint[] = [];
    const latestYear = referenceMonth.year();

    for (let offset = yearsToDisplay - 1; offset >= 0; offset -= 1) {
        const year = latestYear - offset;
        const shoots = bookings.filter((booking) => dayjs(booking.date).year() === year).length;
        const revenue = invoices
            .filter((invoice) => dayjs(invoice.dueDate).year() === year)
            .reduce((total, invoice) => total + invoice.amount, 0);

        result.push({
            label: year.toString(),
            shoots,
            revenue
        });
    }

    return result;
}

function formatDaysUntil(days: number): string {
    if (days <= 0) {
        return 'Today';
    }

    if (days === 1) {
        return 'Tomorrow';
    }

    return `In ${days} days`;
}

type ProfileHighlightsProps = {
    profileStats: { id: string; label: string; value: string }[];
    earningsPercentage: number;
    paidRevenue: number;
    earningsGoal: number;
    earningsRemaining: number;
    deliveredGalleries: number;
    pendingGalleries: number;
    galleryCompletion: number;
    pendingGalleryClients: string[];
};

function ProfileHighlights({
    profileStats,
    earningsPercentage,
    paidRevenue,
    earningsGoal,
    earningsRemaining,
    deliveredGalleries,
    pendingGalleries,
    galleryCompletion,
    pendingGalleryClients
}: ProfileHighlightsProps) {
    return (
        <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-4">
                <Image
                    src="/images/avatar4.svg"
                    alt="Avery Logan"
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700"
                />
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#4534FF] dark:text-[#9DAAFF]">
                        Lead Photographer
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Avery Logan</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">San Francisco Bay Area</p>
                </div>
            </div>
            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                {profileStats.map((stat) => (
                    <div
                        key={stat.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/40"
                    >
                        <dt className="font-medium text-slate-500 dark:text-slate-400">{stat.label}</dt>
                        <dd className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{stat.value}</dd>
                    </div>
                ))}
            </dl>
            <div className="mt-8 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/40">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <EarningsProgress percentage={earningsPercentage} />
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Earnings goal</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(paidRevenue)}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Target {formatCurrency(earningsGoal)} · {formatCurrency(earningsRemaining)} to go
                        </p>
                    </div>
                </div>
            </div>
            <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
                <h3 className="text-xs font-semibold uppercase tracking-[0.32em] text-[#4534FF] dark:text-[#9DAAFF]">Galleries</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {deliveredGalleries} delivered · {pendingGalleries} pending ({galleryCompletion}% complete)
                </p>
                <div className="mt-4 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF]"
                            style={{ width: `${galleryCompletion}%` }}
                        />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{galleryCompletion}%</span>
                </div>
                {pendingGalleryClients.length > 0 && (
                    <p className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                        Pending: {pendingGalleryClients.join(' · ')}
                    </p>
                )}
            </div>
        </section>
    );
}

type EarningsProgressProps = {
    percentage: number;
};

function EarningsProgress({ percentage }: EarningsProgressProps) {
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(Math.max(percentage, 0), 100);
    const offset = circumference * (1 - clamped / 100);

    return (
        <div className="relative h-32 w-32">
            <svg viewBox="0 0 140 140" className="h-full w-full" aria-hidden="true">
                <circle cx="70" cy="70" r={radius} stroke="rgba(148, 163, 184, 0.35)" strokeWidth="12" fill="none" />
                <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="#6366F1"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={offset}
                    transform="rotate(-90 70 70)"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-slate-900 dark:text-white">{clamped}%</span>
                <span className="text-xs font-medium uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">to goal</span>
            </div>
        </div>
    );
}
