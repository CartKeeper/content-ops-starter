import * as React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import dayjs from 'dayjs';

import type { InvoiceRecord, InvoiceTemplateId } from '../../types/invoice';

type BrandDetails = {
    name: string;
    email: string;
    phone?: string;
    website?: string;
    address?: string;
};

type InvoiceDocumentProps = {
    invoice: InvoiceRecord;
    brand: BrandDetails;
};

const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);

const formatDate = (value: string) => dayjs(value).format('MMM D, YYYY');

export function getInvoiceBrandDetails(invoice: InvoiceRecord): BrandDetails {
    const custom = invoice.customFields ?? {};
    const getField = (key: string, fallback: string): string => {
        const value = custom[key];
        return typeof value === 'string' && value.trim() ? value : fallback;
    };

    return {
        name: getField('brand-name', 'Aperture Studio'),
        email: getField('brand-email', 'billing@aperture.studio'),
        phone: getField('brand-phone', '(415) 555-0119'),
        website: getField('brand-website', 'www.aperture.studio'),
        address: getField('brand-address', '500 Market Street, San Francisco, CA')
    };
}

function ClassicTemplate({ invoice, brand }: InvoiceDocumentProps) {
    const styles = StyleSheet.create({
        page: {
            padding: 40,
            fontFamily: 'Helvetica',
            fontSize: 10,
            color: '#1f2933'
        },
        header: {
            borderBottom: '2 solid #4f46e5',
            paddingBottom: 12,
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between'
        },
        brandName: {
            fontSize: 20,
            fontWeight: 700
        },
        sectionTitle: {
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 6,
            textTransform: 'uppercase'
        },
        detailsGrid: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 16
        },
        column: {
            width: '48%'
        },
        tableHeader: {
            display: 'flex',
            flexDirection: 'row',
            backgroundColor: '#eef2ff',
            color: '#312e81',
            borderRadius: 6,
            padding: 8,
            fontWeight: 700
        },
        tableRow: {
            display: 'flex',
            flexDirection: 'row',
            paddingVertical: 6,
            paddingHorizontal: 8,
            borderBottom: '1 solid #e5e7eb'
        },
        descriptionCell: {
            width: '46%'
        },
        qtyCell: {
            width: '18%',
            textAlign: 'right'
        },
        rateCell: {
            width: '18%',
            textAlign: 'right'
        },
        totalCell: {
            width: '18%',
            textAlign: 'right'
        },
        totals: {
            marginTop: 12,
            marginLeft: 'auto',
            width: '45%',
            display: 'flex',
            flexDirection: 'column'
        },
        totalsRow: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 4
        },
        notes: {
            marginTop: 24,
            padding: 12,
            backgroundColor: '#f9fafb',
            borderRadius: 8,
            lineHeight: 1.4
        }
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.brandName}>{brand.name}</Text>
                        <Text>{brand.email}</Text>
                        {brand.phone ? <Text>{brand.phone}</Text> : null}
                        {brand.website ? <Text>{brand.website}</Text> : null}
                    </View>
                    <View>
                        <Text style={{ fontSize: 24, fontWeight: 700, color: '#4338ca' }}>Invoice</Text>
                        <Text>#{invoice.id}</Text>
                        <Text>Issued {formatDate(invoice.issueDate)}</Text>
                        <Text>Due {formatDate(invoice.dueDate)}</Text>
                    </View>
                </View>

                <View style={styles.detailsGrid}>
                    <View style={styles.column}>
                        <Text style={styles.sectionTitle}>Bill to</Text>
                        <Text style={{ fontSize: 12, fontWeight: 600 }}>{invoice.client}</Text>
                        {invoice.clientEmail ? <Text>{invoice.clientEmail}</Text> : null}
                        {invoice.clientAddress ? <Text>{invoice.clientAddress}</Text> : null}
                    </View>
                    <View style={styles.column}>
                        <Text style={styles.sectionTitle}>Project</Text>
                        <Text style={{ fontSize: 12, fontWeight: 600 }}>{invoice.project}</Text>
                        <Text>Status: {invoice.status}</Text>
                    </View>
                </View>

                <View>
                    <View style={styles.tableHeader}>
                        <Text style={styles.descriptionCell}>Description</Text>
                        <Text style={styles.qtyCell}>Qty</Text>
                        <Text style={styles.rateCell}>Rate</Text>
                        <Text style={styles.totalCell}>Total</Text>
                    </View>
                    {invoice.lineItems.map((item) => (
                        <View key={item.id} style={styles.tableRow}>
                            <Text style={styles.descriptionCell}>{item.description}</Text>
                            <Text style={styles.qtyCell}>{item.quantity.toFixed(2)}</Text>
                            <Text style={styles.rateCell}>{formatCurrency(item.unitPrice, invoice.currency)}</Text>
                            <Text style={styles.totalCell}>{formatCurrency(item.total, invoice.currency)}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.totals}>
                    <View style={styles.totalsRow}>
                        <Text>Subtotal</Text>
                        <Text>{formatCurrency(invoice.totals.subtotal, invoice.currency)}</Text>
                    </View>
                    <View style={styles.totalsRow}>
                        <Text>Tax ({Math.round(invoice.taxRate * 100)}%)</Text>
                        <Text>{formatCurrency(invoice.totals.taxTotal, invoice.currency)}</Text>
                    </View>
                    <View style={[styles.totalsRow, { fontSize: 12, fontWeight: 700 }]}>
                        <Text>Total</Text>
                        <Text>{formatCurrency(invoice.totals.total, invoice.currency)}</Text>
                    </View>
                </View>

                {invoice.notes ? (
                    <View style={styles.notes}>
                        <Text style={{ fontWeight: 600, marginBottom: 4 }}>Notes</Text>
                        <Text>{invoice.notes}</Text>
                    </View>
                ) : null}
            </Page>
        </Document>
    );
}

function MinimalTemplate({ invoice, brand }: InvoiceDocumentProps) {
    const styles = StyleSheet.create({
        page: {
            padding: 36,
            fontFamily: 'Helvetica',
            fontSize: 10,
            color: '#111827'
        },
        header: {
            marginBottom: 24
        },
        title: {
            fontSize: 26,
            fontWeight: 700,
            marginBottom: 4
        },
        subtext: {
            fontSize: 10,
            color: '#6b7280'
        },
        section: {
            marginBottom: 18
        },
        sectionHeading: {
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 6
        },
        lineItem: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 6,
            borderBottom: '1 solid #e5e7eb'
        },
        totals: {
            marginTop: 12,
            alignSelf: 'flex-end',
            width: '50%'
        },
        totalsRow: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 4
        }
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>Invoice #{invoice.id}</Text>
                    <Text style={styles.subtext}>{brand.name}</Text>
                    <Text style={styles.subtext}>{brand.email}</Text>
                    {brand.phone ? <Text style={styles.subtext}>{brand.phone}</Text> : null}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeading}>Billed to</Text>
                    <Text>{invoice.client}</Text>
                    {invoice.clientEmail ? <Text>{invoice.clientEmail}</Text> : null}
                    {invoice.clientAddress ? <Text>{invoice.clientAddress}</Text> : null}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeading}>Summary</Text>
                    <Text>Project: {invoice.project}</Text>
                    <Text>Issued: {formatDate(invoice.issueDate)}</Text>
                    <Text>Due: {formatDate(invoice.dueDate)}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeading}>Line items</Text>
                    {invoice.lineItems.map((item) => (
                        <View key={item.id} style={styles.lineItem}>
                            <Text>{item.description}</Text>
                            <Text>
                                {item.quantity} × {formatCurrency(item.unitPrice, invoice.currency)} = {formatCurrency(item.total, invoice.currency)}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.totals}>
                    <View style={styles.totalsRow}>
                        <Text>Subtotal</Text>
                        <Text>{formatCurrency(invoice.totals.subtotal, invoice.currency)}</Text>
                    </View>
                    <View style={styles.totalsRow}>
                        <Text>Tax ({Math.round(invoice.taxRate * 100)}%)</Text>
                        <Text>{formatCurrency(invoice.totals.taxTotal, invoice.currency)}</Text>
                    </View>
                    <View style={[styles.totalsRow, { fontWeight: 700, fontSize: 12 }]}>
                        <Text>Total</Text>
                        <Text>{formatCurrency(invoice.totals.total, invoice.currency)}</Text>
                    </View>
                </View>

                {invoice.notes ? (
                    <View style={{ marginTop: 18 }}>
                        <Text style={styles.sectionHeading}>Notes</Text>
                        <Text>{invoice.notes}</Text>
                    </View>
                ) : null}
            </Page>
        </Document>
    );
}

function BrandedTemplate({ invoice, brand }: InvoiceDocumentProps) {
    const styles = StyleSheet.create({
        page: {
            padding: 0,
            fontFamily: 'Helvetica',
            fontSize: 10,
            color: '#0f172a'
        },
        hero: {
            padding: 40,
            backgroundColor: '#1e40af',
            color: '#f8fafc'
        },
        heroTitle: {
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 6
        },
        heroSub: {
            fontSize: 12,
            opacity: 0.85
        },
        content: {
            padding: 36
        },
        badge: {
            textTransform: 'uppercase',
            letterSpacing: 2,
            fontSize: 10,
            marginBottom: 8
        },
        card: {
            backgroundColor: '#f8fafc',
            padding: 18,
            borderRadius: 12,
            marginBottom: 20
        },
        cardTitle: {
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 6
        },
        lineItemHeader: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 8,
            fontWeight: 700
        },
        lineItemRow: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 5,
            borderBottom: '1 solid #e2e8f0'
        },
        totals: {
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            marginTop: 12
        },
        totalsRow: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between'
        }
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.hero}>
                    <Text style={styles.badge}>Official invoice</Text>
                    <Text style={styles.heroTitle}>{brand.name}</Text>
                    <Text style={styles.heroSub}>{brand.email}</Text>
                    {brand.website ? <Text style={styles.heroSub}>{brand.website}</Text> : null}
                    <Text style={{ marginTop: 16 }}>Invoice #{invoice.id}</Text>
                    <Text>Issued {formatDate(invoice.issueDate)}</Text>
                    <Text>Due {formatDate(invoice.dueDate)}</Text>
                </View>

                <View style={styles.content}>
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Bill to</Text>
                        <Text style={{ fontSize: 12, fontWeight: 600 }}>{invoice.client}</Text>
                        {invoice.clientEmail ? <Text>{invoice.clientEmail}</Text> : null}
                        {invoice.clientAddress ? <Text>{invoice.clientAddress}</Text> : null}
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Project overview</Text>
                        <Text>{invoice.project}</Text>
                        <Text>Status: {invoice.status}</Text>
                        {invoice.notes ? <Text style={{ marginTop: 6 }}>{invoice.notes}</Text> : null}
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Line items</Text>
                        <View style={styles.lineItemHeader}>
                            <Text>Description</Text>
                            <Text>Total</Text>
                        </View>
                        {invoice.lineItems.map((item) => (
                            <View key={item.id} style={styles.lineItemRow}>
                                <View>
                                    <Text style={{ fontWeight: 600 }}>{item.description}</Text>
                                    <Text style={{ color: '#64748b' }}>
                                        {item.quantity} × {formatCurrency(item.unitPrice, invoice.currency)}
                                    </Text>
                                </View>
                                <Text>{formatCurrency(item.total, invoice.currency)}</Text>
                            </View>
                        ))}
                        <View style={styles.totals}>
                            <View style={styles.totalsRow}>
                                <Text>Subtotal</Text>
                                <Text>{formatCurrency(invoice.totals.subtotal, invoice.currency)}</Text>
                            </View>
                            <View style={styles.totalsRow}>
                                <Text>Tax ({Math.round(invoice.taxRate * 100)}%)</Text>
                                <Text>{formatCurrency(invoice.totals.taxTotal, invoice.currency)}</Text>
                            </View>
                            <View style={[styles.totalsRow, { fontSize: 12, fontWeight: 700 }]}>
                                <Text>Total due</Text>
                                <Text>{formatCurrency(invoice.totals.total, invoice.currency)}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
}

export function renderInvoiceTemplate(template: InvoiceTemplateId, invoice: InvoiceRecord) {
    const brand = getInvoiceBrandDetails(invoice);

    switch (template) {
        case 'minimal':
            return <MinimalTemplate invoice={invoice} brand={brand} />;
        case 'branded':
            return <BrandedTemplate invoice={invoice} brand={brand} />;
        case 'classic':
        default:
            return <ClassicTemplate invoice={invoice} brand={brand} />;
    }
}
