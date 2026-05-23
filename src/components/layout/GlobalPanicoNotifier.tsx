'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Smartphone, X } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';

/**
 * Componente global montado en el DashboardLayout.
 * Escucha 'alerta-panico-nueva' desde cualquier página del sistema
 * y notifica al operador aunque no esté en el módulo de alertas.
 */
export default function GlobalPanicoNotifier() {
  const qc          = useQueryClient();
  const router      = useRouter();
  const pathname    = usePathname();

  // Ref para leer el pathname actual dentro del callback (closure fija de useSocket)
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  useSocket({
    'alerta-panico-nueva': (_payload: { alertaId: number }) => {
      // Siempre refrescar el cache — cuando el operador entre al módulo verá datos frescos
      qc.invalidateQueries({ queryKey: ['panico', 'alertas'] });
      qc.invalidateQueries({ queryKey: ['panico', 'stats'] });

      // Si ya está en el módulo, el refetch es suficiente — no mostrar toast duplicado
      if (pathnameRef.current === '/alertas-sjl') return;

      toast.custom(
        (t) => (
          <div
            role="button"
            tabIndex={0}
            className={`flex items-center gap-3 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-xl shadow-xl px-4 py-3 cursor-pointer w-80 transition-all ${
              t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
            onClick={() => { toast.dismiss(t.id); router.push('/alertas-sjl'); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { toast.dismiss(t.id); router.push('/alertas-sjl'); } }}
          >
            {/* Ícono pulsante */}
            <span className="relative flex-shrink-0">
              <span className="absolute inset-0 rounded-full bg-red-400 opacity-30 animate-ping" />
              <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40">
                <Smartphone className="h-4 w-4 text-red-600 dark:text-red-400" />
              </span>
            </span>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">
                Nueva alerta de pánico
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Toca para ir al módulo →
              </p>
            </div>

            {/* Cerrar */}
            <button
              className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
              aria-label="Cerrar notificación"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
        { duration: 12000, id: 'alerta-panico-nueva' }, // id fijo: evita duplicados si llegan varias rápido
      );
    },
  });

  return null;
}
