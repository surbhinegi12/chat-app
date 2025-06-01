import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    if (router.pathname === '/') {
      router.replace('/login');
    }
  }, [router]);

  return <Component {...pageProps} />;
}

export default MyApp; 