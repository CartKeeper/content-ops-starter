import * as React from 'react';
import dayjs from 'dayjs';

import StatusPill, { StatusTone } from './StatusPill';
import { CRM_BRAND_ACCENT_GLOW, CRM_BRAND_ACCENT_GLOW_SOFT } from './theme';

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
    customFields?: Record<string, string | boolean>;
};

const statusToneMap: Record<BookingStatus, StatusTone> = {
    Confirmed: 'success',
    Pending: 'warning',
    Editing: 'info'
};

const formatDate = (value: string) => dayjs(value).format('ddd, MMM D');

export function BookingList({ bookings }: { bookings: BookingRecord[] }) {
    return (
        <ol className="relative space-y-6 border-l border-slate-200 pl-6 dark:border-white/10">
            {bookings.map((booking) => (
                <li key={booking.id} className="relative">
                    <span className="absolute -left-3 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#2DD4BF]/20 text-[#0F766E] shadow-sm dark:border-[#0b162c] dark:bg-[#2DD4BF]/30 dark:text-[#5EEAD4]">
                        •
                    </span>
                    <div className="relative overflow-hidden rounded-xl border border-white/30 bg-white/75 p-4 shadow-sm backdrop-blur-lg transition dark:border-white/10 dark:bg-[#0d1c33]/70">
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-16 -top-10 h-32 w-32 rounded-full blur-3xl"
                            style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW}, transparent 70%)` }}
                        />
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-14 left-6 h-32 w-32 rounded-full blur-3xl"
                            style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW_SOFT}, transparent 75%)` }}
                        />
                        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-[#0F766E] dark:text-[#5EEAD4]">{formatDate(booking.date)}</p>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{booking.client}</h3>
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
                        <div className="relative z-10 mt-3">
                            <StatusPill tone={statusToneMap[booking.status]}>{booking.status}</StatusPill>
                        </div>
                    </div>
                </li>
            ))}
        </ol>
    );
}

export default BookingList;
