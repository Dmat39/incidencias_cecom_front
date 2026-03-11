import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CECOM - Sistema de Incidencias',
  description: 'Centro de Control Municipal - Sistema de Gestión de Incidencias',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-50`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
