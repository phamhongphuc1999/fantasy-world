import type { Metadata } from 'next';
import { Fira_Code, Geist } from 'next/font/google';
import { type ReactNode } from 'react';
import { APP_NAME, siteMetadata } from 'src/configs/constance';
import { cn } from 'src/lib/utils';
import '../src/styles/globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const firaCode = Fira_Code({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.url),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: siteMetadata.description,
  applicationName: siteMetadata.siteName,
  keywords: siteMetadata.keywords,
  icons: {
    icon: siteMetadata.icon,
  },
  openGraph: {
    title: siteMetadata.title,
    description: siteMetadata.description,
    url: siteMetadata.url,
    siteName: siteMetadata.siteName,
    type: 'website',
    images: [siteMetadata.image],
  },
  twitter: {
    card: 'summary_large_image',
    site: `@${siteMetadata.twitterHandle}`,
    title: siteMetadata.title,
    description: siteMetadata.description,
    images: [siteMetadata.image],
  },
};

interface TProps {
  children: ReactNode;
}

export default function RootLayout({ children }: TProps) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body className={cn('flex min-h-full flex-col antialiased', firaCode.className)}>
        {children}
      </body>
    </html>
  );
}
