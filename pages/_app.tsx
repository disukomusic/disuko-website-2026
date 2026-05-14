import '../styles/globals.css';
import type { AppProps } from 'next/app';

import { WindowProvider } from '../components/WindowSystem';

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <WindowProvider>
            <Component {...pageProps} />
        </WindowProvider>
    );
}