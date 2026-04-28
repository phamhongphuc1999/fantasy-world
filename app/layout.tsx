import type { Metadata } from 'next';
import { Fira_Code } from 'next/font/google';
import { type ReactNode } from 'react';
import { APP_NAME, siteMetadata } from 'src/configs/constance';
import { cn } from 'src/services';
import '../src/styles/globals.css';

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
    <html lang="en">
      <body className={cn('flex min-h-full flex-col antialiased', firaCode.className)}>
        {children}
      </body>
    </html>
  );
}
