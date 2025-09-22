import type { GetServerSideProps } from 'next';

const SettingsIndexRedirect = () => null;

export const getServerSideProps: GetServerSideProps = async () => ({
    redirect: {
        destination: '/settings/general',
        permanent: false
    }
});

export default SettingsIndexRedirect;
