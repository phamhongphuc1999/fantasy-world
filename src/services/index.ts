import { Metadata } from 'next';
import { APP_NAME } from 'src/configs/constance';

export function generateAppMetadata(title: string): Metadata {
  return { title: `${APP_NAME} | ${title}`, openGraph: { title: `${APP_NAME} | ${title}` } };
}
