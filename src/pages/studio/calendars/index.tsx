import Head from 'next/head';

import { StudioCalendar } from '../../../components/calendar/StudioCalendar';
import { CrmAuthGuard, WorkspaceLayout } from '../../../components/crm';

export default function StudioCalendarsPage() {
    return (
        <CrmAuthGuard>
            <WorkspaceLayout>
                <Head>
                    <title>Calendar · Aperture Studio CRM</title>
                </Head>
                <StudioCalendar />
            </WorkspaceLayout>
        </CrmAuthGuard>
    );
}
