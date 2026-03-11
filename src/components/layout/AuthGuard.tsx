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
  '/catalogos':   'catalogos',
  '/reportes':    'reportes',
  '/auditoria':   'auditoria',
  '/svi':         'svi',
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
  const { isAuthenticated, modulosPermitidos, setModulos } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Fetch permisos desde el backend si aún no se han cargado
    const fetchMe = async () => {
      try {
        if (modulosPermitidos.length === 0) {
          const { data } = await api.get('/auth/me');
          const modulos: string[] = data?.data?.modulosPermitidos ?? data?.modulosPermitidos ?? [];
          setModulos(modulos);
          checkAccess(modulos);
        } else {
          checkAccess(modulosPermitidos);
        }
      } catch {
        router.replace('/login');
      } finally {
        setChecked(true);
      }
    };

    const checkAccess = (modulos: string[]) => {
      const modulo = getModuloForPath(pathname);
      if (modulo && !modulos.includes(modulo)) {
        // Redirigir al primer módulo permitido
        const primera = modulos[0] ? `/${modulos[0]}` : '/login';
        router.replace(primera);
      }
    };

    fetchMe();
  }, [isAuthenticated, pathname]);

  if (!isAuthenticated) return null;
  if (!checked) return null; // evita flash de contenido no autorizado

  return <>{children}</>;
}
