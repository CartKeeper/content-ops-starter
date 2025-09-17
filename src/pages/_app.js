import '../css/main.css';

import { NetlifyIdentityProvider } from '../components/auth';
import { QuickActionSettingsProvider } from '../components/crm/quick-action-settings';

export default function MyApp({ Component, pageProps }) {
    return (
        <NetlifyIdentityProvider>
            <QuickActionSettingsProvider>
                <Component {...pageProps} />
            </QuickActionSettingsProvider>
        </NetlifyIdentityProvider>
    );
}
