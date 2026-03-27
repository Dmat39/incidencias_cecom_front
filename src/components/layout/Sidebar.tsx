'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useSviAuthStore } from '@/store/sviAuthStore';
import {
  LayoutDashboard,
  AlertTriangle,
  Map,
  Shield,
  Users,
  BookOpen,
  FileBarChart,
  ClipboardList,
  MonitorPlay,
  History,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard, modulo: 'dashboard' },
  { href: '/incidencias', label: 'Incidencias',  icon: AlertTriangle,   modulo: 'incidencias' },
  { href: '/mapa',        label: 'Mapa en Vivo', icon: Map,             modulo: 'mapa' },
  { href: '/serenos',     label: 'Serenos',      icon: Shield,          modulo: 'serenos' },
  { href: '/usuarios',    label: 'Usuarios',     icon: Users,           modulo: 'usuarios' },
  { href: '/catalogos',   label: 'Catálogos',    icon: BookOpen,        modulo: 'catalogos' },
  { href: '/reportes',    label: 'Reportes',     icon: FileBarChart,    modulo: 'reportes' },
  { href: '/auditoria',   label: 'Auditoría',    icon: ClipboardList,   modulo: 'auditoria' },
];

const sviSubItems = [
  { href: '/svi/incidencias', label: 'Incidencias', icon: MonitorPlay },
  { href: '/svi/historial',   label: 'Historial',   icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, modulosPermitidos } = useAuthStore();
  const { isAuthenticated: sviAuth, logout: sviLogout } = useSviAuthStore();
  const [sviOpen, setSviOpen] = useState(() => pathname.startsWith('/svi'));

  const sviActive = pathname.startsWith('/svi');

  return (
    <aside className="w-64 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700/60 flex flex-col">
      {/* Logo */}
      <div className="px-4 h-[73px] border-b border-gray-200 dark:border-gray-700/60 flex items-center gap-3">
        <Image src="/logo.png" alt="CECOM" width={40} height={40} className="rounded" />
        <div>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">CECOM</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Sistema de Incidencias</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (!modulosPermitidos.includes(item.modulo)) return null;
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-green-50 dark:bg-green-900/25 text-green-700 dark:text-green-400 font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100',
              )}
            >
              <Icon className={cn('h-5 w-5', isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500')} />
              {item.label}
            </Link>
          );
        })}

        {/* ── SVI módulo (collapsible) ── */}
        {modulosPermitidos.includes('svi') && <div>
            <button
              onClick={() => setSviOpen((v) => !v)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                sviActive
                  ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100',
              )}
            >
              <Shield className={cn('h-5 w-5', sviActive ? 'text-slate-600 dark:text-slate-400' : 'text-gray-400 dark:text-gray-500')} />
              <span className="flex-1 text-left">SVI</span>
              {sviAuth && (
                <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold mr-1">
                  activo
                </span>
              )}
              <ChevronDown
                className={cn('h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform', sviOpen && 'rotate-180')}
              />
            </button>

            {sviOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-3">
                {sviSubItems.map((sub) => {
                  const Icon = sub.icon;
                  const isActive = pathname === sub.href || pathname.startsWith(sub.href + '/');
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={cn(
                        'flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-semibold'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100',
                      )}
                    >
                      <Icon className={cn('h-4 w-4', isActive ? 'text-slate-600 dark:text-slate-400' : 'text-gray-400 dark:text-gray-500')} />
                      {sub.label}
                    </Link>
                  );
                })}

                {/* Cerrar sesión SVI */}
                {sviAuth && (
                  <button
                    onClick={() => sviLogout()}
                    className="w-full flex items-center gap-2 px-2 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Cerrar sesión SVI
                  </button>
                )}
              </div>
            )}
          </div>}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700/60">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-sm">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{user?.username || 'Usuario'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.roles?.join(', ')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
