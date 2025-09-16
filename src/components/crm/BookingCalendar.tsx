import { Fragment, useMemo } from 'react';
import type { Booking } from '../../lib/mock-data';

function formatDate(date: string) {
    return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(date));
}

type BookingCalendarProps = {
    bookings: Booking[];
};

export function BookingCalendar({ bookings }: BookingCalendarProps) {
    const grouped = useMemo(() => {
        return bookings
            .slice()
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .reduce<Record<string, Booking[]>>((acc, booking) => {
                const key = booking.date;
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(booking);
                return acc;
            }, {});
    }, [bookings]);

    const upcoming = Object.entries(grouped).slice(0, 8);

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-200">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Booking Calendar</h2>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-300">
                    {bookings.length} scheduled
                </span>
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-400">Next eight shoots</p>
            <div className="mt-6 space-y-6">
                {upcoming.map(([date, items]) => (
                    <Fragment key={date}>
                        <div className="flex items-start gap-4">
                            <div className="min-w-[120px] rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-emerald-200">
                                {formatDate(date)}
                            </div>
                            <div className="flex-1 space-y-4">
                                {items.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 shadow-lg shadow-slate-950/40"
                                    >
                                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                            <div>
                                                <p className="text-sm font-semibold text-white">{booking.shootType}</p>
                                                <p className="text-xs text-slate-400">{booking.location}</p>
                                            </div>
                                            <div className="text-right text-xs text-slate-400">
                                                <p>
                                                    {booking.startTime} – {booking.endTime}
                                                </p>
                                                <p className="mt-1 capitalize">{booking.status}</p>
                                            </div>
                                        </div>
                                        {booking.deliverables && (
                                            <p className="mt-3 text-xs leading-relaxed text-slate-300">{booking.deliverables}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Fragment>
                ))}
                {upcoming.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-800/80 bg-slate-950/40 p-6 text-center text-sm text-slate-400">
                        No upcoming bookings scheduled.
                    </p>
                )}
            </div>
        </div>
    );
}
