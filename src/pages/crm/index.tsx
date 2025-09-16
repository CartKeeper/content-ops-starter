import * as React from 'react';
import Head from 'next/head';

import {
    BookingList,
    ClientTable,
    DashboardCard,
    InvoiceTable,
    SectionCard,
    TaskList,
    type BookingRecord,
    type ClientRecord,
    type InvoiceRecord,
    type TaskRecord
} from '../../components/crm';

const metrics = [
    {
        id: 'revenue',
        title: 'Monthly Revenue',
        value: '$18,450',
        trend: {
            value: '+12%',
            label: 'vs last month'
        }
    },
    {
        id: 'bookings',
        title: 'Upcoming Shoots',
        value: '14',
        trend: {
            value: '6 confirmed',
            label: 'next 30 days'
        }
    },
    {
        id: 'galleries',
        title: 'Galleries to Deliver',
        value: '5',
        trend: {
            value: '3 due this week'
        }
    },
    {
        id: 'invoices',
        title: 'Outstanding Invoices',
        value: '$4,300',
        trend: {
            value: '2 overdue',
            isPositive: false
        }
    }
];

const bookings: BookingRecord[] = [
    {
        id: 'bk-01',
        client: 'Evelyn Sanders',
        shootType: 'Engagement Session',
        date: '2024-05-11',
        startTime: '3:00 PM',
        endTime: '5:00 PM',
        location: 'Golden Gate Park',
        status: 'Confirmed'
    },
    {
        id: 'bk-02',
        client: 'Harrison & June',
        shootType: 'Wedding',
        date: '2024-05-18',
        startTime: '11:00 AM',
        endTime: '8:00 PM',
        location: 'Terranea Resort',
        status: 'Pending'
    },
    {
        id: 'bk-03',
        client: 'Sona Patel',
        shootType: 'Brand Lifestyle',
        date: '2024-05-21',
        startTime: '9:00 AM',
        endTime: '12:00 PM',
        location: 'Downtown Studio',
        status: 'Editing'
    }
];

const clients: ClientRecord[] = [
    {
        id: 'cl-01',
        name: 'Evelyn Sanders',
        email: 'evelyn@wanderlust.com',
        phone: '(415) 555-0108',
        shoots: 6,
        lastShoot: '2024-04-22',
        upcomingShoot: '2024-05-11',
        status: 'Active'
    },
    {
        id: 'cl-02',
        name: 'Harrison & June',
        email: 'hello@harrisonandjune.com',
        phone: '(424) 555-0145',
        shoots: 2,
        lastShoot: '2023-11-18',
        upcomingShoot: '2024-05-18',
        status: 'Lead'
    },
    {
        id: 'cl-03',
        name: 'Sona Patel',
        email: 'sona@patelcreative.co',
        phone: '(415) 555-0121',
        shoots: 3,
        lastShoot: '2024-04-02',
        upcomingShoot: '2024-05-21',
        status: 'Active'
    },
    {
        id: 'cl-04',
        name: 'Fern & Pine Studio',
        email: 'contact@fernandpine.com',
        phone: '(510) 555-0186',
        shoots: 4,
        lastShoot: '2023-12-14',
        status: 'Archived'
    }
];

const invoices: InvoiceRecord[] = [
    {
        id: '1024',
        client: 'Evelyn Sanders',
        project: 'Engagement Session',
        amount: 1150,
        dueDate: '2024-05-05',
        status: 'Sent'
    },
    {
        id: '1023',
        client: 'Harrison & June',
        project: 'Wedding Collection',
        amount: 3800,
        dueDate: '2024-04-28',
        status: 'Overdue'
    },
    {
        id: '1022',
        client: 'Sona Patel',
        project: 'Brand Lifestyle',
        amount: 1450,
        dueDate: '2024-04-15',
        status: 'Paid'
    }
];

const tasks: TaskRecord[] = [
    {
        id: 'task-01',
        title: 'Send Harrison & June final timeline',
        dueDate: '2024-05-07',
        assignee: 'You',
        completed: false
    },
    {
        id: 'task-02',
        title: 'Cull and edit Sona Patel preview set',
        dueDate: '2024-05-06',
        assignee: 'Retouch Team',
        completed: false
    },
    {
        id: 'task-03',
        title: 'Email Evelyn gallery delivery details',
        dueDate: '2024-05-03',
        assignee: 'You',
        completed: true
    }
];

const quickActions = [
    { id: 'new-booking', label: 'Schedule shoot' },
    { id: 'new-invoice', label: 'Create invoice' },
    { id: 'upload-gallery', label: 'Upload gallery' }
];

export default function PhotographyCrmDashboard() {
    return (
        <>
            <Head>
                <title>Photography CRM Dashboard</title>
                <meta name="description" content="Command center for managing photography clients, shoots and invoices." />
            </Head>
            <main className="min-h-screen bg-slate-50 pb-16">
                <div className="mx-auto max-w-7xl px-6 pt-12">
                    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Studio Command Center</p>
                            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
                                Photography CRM Dashboard
                            </h1>
                            <p className="mt-3 max-w-2xl text-base text-slate-600">
                                Track client relationships, keep shoots on schedule, and stay ahead of deliverables—all from a
                                single workspace designed for busy photographers.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {quickActions.map((action) => (
                                <button
                                    key={action.id}
                                    className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </header>

                    <section className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                        {metrics.map((metric) => (
                            <DashboardCard key={metric.id} title={metric.title} value={metric.value} trend={metric.trend} />
                        ))}
                    </section>

                    <div className="mt-10 grid gap-6 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                            <SectionCard
                                title="Upcoming Shoots"
                                description="Stay ready for every session with a quick view of the week ahead."
                                action={<button className="text-sm font-semibold text-indigo-600">Open calendar</button>}
                            >
                                <BookingList bookings={bookings} />
                            </SectionCard>

                            <SectionCard
                                title="Active Clients"
                                description="From loyal regulars to new leads, see who needs attention next."
                                action={<button className="text-sm font-semibold text-indigo-600">View all clients</button>}
                            >
                                <ClientTable clients={clients} />
                            </SectionCard>
                        </div>
                        <div className="space-y-6">
                            <SectionCard
                                title="Open Invoices"
                                description="Collect payments faster with a focused list of outstanding balances."
                            >
                                <InvoiceTable invoices={invoices} />
                            </SectionCard>

                            <SectionCard
                                title="Studio Tasks"
                                description="Keep production moving with next actions across your team."
                                action={<button className="text-sm font-semibold text-indigo-600">Create task</button>}
                            >
                                <TaskList tasks={tasks} />
                            </SectionCard>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
