import * as React from 'react';
import dayjs from 'dayjs';

import StatusPill, { StatusTone } from './StatusPill';

export type BookingStatus = 'Confirmed' | 'Pending' | 'Editing';

export type BookingRecord = {
    id: string;
    client: string;
    shootType: string;
    date: string;
    startTime: string;
    endTime?: string;
    location: string;
    status: BookingStatus;
};

const statusToneMap: Record<BookingStatus, StatusTone> = {
    Confirmed: 'success',
    Pending: 'warning',
    Editing: 'info'
};

const formatDate = (value: string) => dayjs(value).format('ddd, MMM D');

export function BookingList({ bookings }: { bookings: BookingRecord[] }) {
    return (
        <ol className="relative space-y-6 border-l border-slate-200 pl-6 dark:border-slate-800">
            {bookings.map((booking) => (
                <li key={booking.id} className="relative">
                    <span className="absolute -left-3 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-indigo-500 dark:border-slate-900 dark:bg-indigo-500/20 dark:text-indigo-300">
                        •
                    </span>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{formatDate(booking.date)}</p>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{booking.client}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{booking.shootType}</p>
                            </div>
                            <div className="text-right text-sm text-slate-500 dark:text-slate-400">
                                <p>
                                    {booking.startTime}
                                    {booking.endTime ? ` – ${booking.endTime}` : ''}
                                </p>
                                <p>{booking.location}</p>
                            </div>
                        </div>
                        <div className="mt-3">
                            <StatusPill tone={statusToneMap[booking.status]}>{booking.status}</StatusPill>
                        </div>
                    </div>
                </li>
            ))}
        </ol>
    );
}

export default BookingList;
