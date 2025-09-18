import * as React from 'react';
import dayjs from 'dayjs';

import StatusPill, { StatusTone } from './StatusPill';

export type ClientStatus = 'Active' | 'Lead' | 'Archived';

export type ClientRecord = {
    id: string;
    name: string;
    company?: string;
    email: string;
    phone?: string;
    shoots: number;
    lastShoot: string;
    upcomingShoot?: string;
    status: ClientStatus;
    ownerId?: string;
    ownerName?: string;
};

const statusToneMap: Record<ClientStatus, StatusTone> = {
    Active: 'success',
    Lead: 'info',
    Archived: 'neutral'
};

const formatDate = (value?: string) => (value ? dayjs(value).format('MMM D, YYYY') : '—');

export function ClientTable({ clients }: { clients: ClientRecord[] }) {
    return (
        <div className="table-responsive">
            <table className="table card-table table-vcenter">
                <thead>
                    <tr>
                        <th>Client</th>
                        <th>Shoots</th>
                        <th>Last session</th>
                        <th>Upcoming</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {clients.map((client) => (
                        <tr key={client.id}>
                            <td>
                                <div className="fw-semibold">{client.name}</div>
                                <div className="text-secondary">{client.email}</div>
                            </td>
                            <td>
                                <div className="fw-semibold">{client.shoots}</div>
                                {client.phone ? <div className="text-secondary small">{client.phone}</div> : null}
                            </td>
                            <td className="text-secondary">{formatDate(client.lastShoot)}</td>
                            <td className="text-secondary">{formatDate(client.upcomingShoot)}</td>
                            <td>
                                <StatusPill tone={statusToneMap[client.status]}>{client.status}</StatusPill>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ClientTable;
