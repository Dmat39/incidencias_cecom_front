'use client';

import { usePathname } from 'next/navigation';
import { Bell, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const title = Object.entries(routeLabels).find(([path]) =>
    path === pathname || (path !== '/' && pathname.startsWith(path))
  )?.[1] ?? 'CECOM';

  const isDark = theme === 'dark';

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/60 px-6 h-[73px] flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {/* Toggle dark/light */}
        {mounted && (
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        )}
        <button className="relative p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.username}</span>
        </div>
      </div>
    </header>
  );
}
