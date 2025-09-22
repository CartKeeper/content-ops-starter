import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';

import { SettingsWorkspace, SettingsPageContainer } from '../../components/settings/SettingsWorkspace';
import { SETTINGS_TABS, isValidSettingsSection, type SettingsSection } from '../../components/settings/settings-sections';

type SettingsSectionPageProps = {
    section: SettingsSection;
};

export const getServerSideProps: GetServerSideProps<SettingsSectionPageProps> = async ({ params }) => {
    const rawSection = typeof params?.section === 'string' ? params.section.toLowerCase() : '';

    if (!isValidSettingsSection(rawSection)) {
        return {
            redirect: {
                destination: '/settings/general',
                permanent: false
            }
        };
    }

    return {
        props: { section: rawSection as SettingsSection }
    };
};

export default function SettingsSectionPage({
    section
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const tab = SETTINGS_TABS.find((entry) => entry.id === section);
    const pageTitle = tab ? `${tab.label} · Settings · Aperture Studio CRM` : 'Settings · Aperture Studio CRM';

    return (
        <>
            <Head>
                <title>{pageTitle}</title>
            </Head>
            <SettingsPageContainer>
                <SettingsWorkspace activeSection={section} />
            </SettingsPageContainer>
        </>
    );
}
