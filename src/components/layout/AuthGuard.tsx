'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

// Mapa ruta → módulo requerido
const ROUTE_MODULO: Record<string, string> = {
  '/dashboard':   'dashboard',
  '/incidencias': 'incidencias',
  '/mapa':        'mapa',
  '/serenos':     'serenos',
  '/usuarios':    'usuarios',
  '/roles':       'usuarios',
  '/catalogos':   'catalogos',
  '/reportes':    'reportes',
  '/auditoria':   'auditoria',
  '/svi':         'svi',
  '/alertas-sjl': 'alertas',
  '/vecinos-app': 'alertas',
};

function getModuloForPath(pathname: string): string | null {
  for (const [route, modulo] of Object.entries(ROUTE_MODULO)) {
    if (pathname === route || pathname.startsWith(route + '/')) return modulo;
  }
  return null;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, modulosPermitidos, setModulos, setJurisdicciones, logout, _hasHydrated } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Esperar a que Zustand rehydrate desde localStorage antes de redirigir
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Fetch permisos desde el backend si aún no se han cargado
    const fetchMe = async () => {
      try {
        if (modulosPermitidos.length === 0) {
          const { data } = await api.get('/auth/me');
          const payload = data?.data ?? data ?? {};
          const modulos: string[] = payload.modulosPermitidos ?? [];
          const jurisdicciones: number[] = payload.jurisdiccionesAsignadas ?? [];
          setModulos(modulos);
          setJurisdicciones(jurisdicciones);
          checkAccess(modulos);
        } else {
          checkAccess(modulosPermitidos);
        }
      } catch {
        logout();
        router.replace('/login');
      } finally {
        setChecked(true);
      }
    };

    const checkAccess = (modulos: string[]) => {
      const modulo = getModuloForPath(pathname);
      if (modulo && !modulos.includes(modulo)) {
        if (modulos.length === 0) {
          logout();
          router.replace('/login');
          return;
        }
        // Redirigir al primer módulo permitido
        router.replace(`/${modulos[0]}`);
      }
    };

    fetchMe();
  }, [isAuthenticated, pathname, _hasHydrated]);

  // Mientras Zustand rehydrata o hace el check, no mostrar nada
  if (!_hasHydrated) return null;
  if (!isAuthenticated) return null;
  if (!checked) return null;

  return <>{children}</>;
}
