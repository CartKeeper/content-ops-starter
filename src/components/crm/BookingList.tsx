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
    customFields?: Record<string, string | boolean>;
    ownerId?: string;
    ownerName?: string;
};

const statusToneMap: Record<BookingStatus, StatusTone> = {
    Confirmed: 'success',
    Pending: 'warning',
    Editing: 'info'
};

const formatDate = (value: string) => dayjs(value).format('ddd, MMM D');

export function BookingList({ bookings }: { bookings: BookingRecord[] }) {
    return (
        <ul className="timeline timeline-simple">
            {bookings.map((booking) => (
                <li key={booking.id} className="timeline-event">
                    <div className="timeline-event-icon bg-primary" aria-hidden />
                    <div className="card timeline-event-card">
                        <div className="card-body">
                            <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
                                <div>
                                    <div className="text-uppercase text-secondary fw-semibold small">{formatDate(booking.date)}</div>
                                    <h3 className="h4 mb-1">{booking.client}</h3>
                                    <div className="text-secondary">{booking.shootType}</div>
                                </div>
                                <div className="text-end text-secondary">
                                    <div>
                                        {booking.startTime}
                                        {booking.endTime ? ` – ${booking.endTime}` : ''}
                                    </div>
                                    <div>{booking.location}</div>
                                </div>
                            </div>
                            <div className="mt-3">
                                <StatusPill tone={statusToneMap[booking.status]}>{booking.status}</StatusPill>
                            </div>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default BookingList;
