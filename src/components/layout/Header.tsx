'use client';

import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/incidencias': 'Incidencias',
  '/incidencias/nueva': 'Nueva Incidencia',
  '/mapa': 'Mapa en Vivo',
  '/serenos': 'Serenos',
  '/usuarios': 'Usuarios',
  '/catalogos': 'Catálogos',
  '/reportes': 'Reportes',
};

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const title = Object.entries(routeLabels).find(([path]) =>
    path === pathname || (path !== '/' && pathname.startsWith(path))
  )?.[1] ?? 'CECOM';

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        <p className="text-xs text-gray-500">
          {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium text-gray-700">{user?.username}</span>
        </div>
      </div>
    </header>
  );
}
