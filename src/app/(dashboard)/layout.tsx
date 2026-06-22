'use client';

import { usePathname } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import GlobalPanicoNotifier from '@/components/layout/GlobalPanicoNotifier';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname === '/mapa' || pathname === '/alertas-sjl/mapa';

  return (
    <AuthGuard>
      {/* Escucha alertas de pánico en cualquier página del dashboard */}
      <GlobalPanicoNotifier />
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className={`flex-1 overflow-hidden ${fullBleed ? '' : 'p-6 overflow-auto'}`}>
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
