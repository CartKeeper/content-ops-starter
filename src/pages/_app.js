import '../css/main.css';

import { QuickActionSettingsProvider } from '../components/crm/quick-action-settings';

export default function MyApp({ Component, pageProps }) {
    return (
        <QuickActionSettingsProvider>
            <Component {...pageProps} />
        </QuickActionSettingsProvider>
    );
}
