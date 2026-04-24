import type { Metadata } from 'next';
import { Fira_Code } from 'next/font/google';
import { ReactNode } from 'react';
import { MetadataHead } from 'src/components/MetadataHead';
import { APP_NAME } from 'src/configs/constance';
import { cn } from 'src/lib/utils';
import '../src/styles/globals.css';

const firaCode = Fira_Code({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: '%s' },
};

interface Props {
  children: ReactNode;
}

export default function RootLayout({ children }: Props) {
  return (
    <html lang="en">
      <MetadataHead />
      <body className={cn('flex min-h-full flex-col antialiased', firaCode.className)}>
        {children}
      </body>
    </html>
  );
}
