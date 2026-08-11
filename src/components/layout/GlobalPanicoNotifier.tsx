'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Smartphone, X } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';

const ORIGINAL_TITLE = 'CECOM — Incidencias';
const ALERT_TITLE    = '🚨 ALERTA DE PÁNICO';

function playAlertSound() {
  try {
    const ctx  = new AudioContext();
    const beep = (freq: number, start: number, duration: number) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    // tres beeps cortos ascendentes
    beep(880, 0,    0.18);
    beep(988, 0.22, 0.18);
    beep(1174, 0.44, 0.28);
  } catch {
    // AudioContext no disponible — ignorar silenciosamente
  }
}

/**
 * Componente global montado en el DashboardLayout.
 * Escucha 'alerta-panico-nueva' desde cualquier página del sistema
 * y notifica al operador aunque no esté en el módulo de alertas.
 */
export default function GlobalPanicoNotifier() {
  const qc          = useQueryClient();
  const router      = useRouter();
  const pathname    = usePathname();

  const pathnameRef   = useRef(pathname);
  const blinkInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  // Pedir permiso de notificaciones del sistema (opcional — funciona aunque rechacen)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Detener parpadeo al volver a la pestaña
  useEffect(() => {
    const stop = () => {
      if (!document.hidden) {
        if (blinkInterval.current) {
          clearInterval(blinkInterval.current);
          blinkInterval.current = null;
        }
        document.title = ORIGINAL_TITLE;
      }
    };
    document.addEventListener('visibilitychange', stop);
    return () => document.removeEventListener('visibilitychange', stop);
  }, []);

  function startTitleBlink() {
    if (blinkInterval.current) return; // ya está parpadeando
    let visible = true;
    blinkInterval.current = setInterval(() => {
      document.title = visible ? ALERT_TITLE : ORIGINAL_TITLE;
      visible = !visible;
    }, 800);
  }

  useSocket({
    'alerta-panico-nueva': (_payload: { alertaId: number }) => {
      qc.invalidateQueries({ queryKey: ['panico', 'alertas'] });
      qc.invalidateQueries({ queryKey: ['panico', 'stats'] });

      // Sonido — no requiere permiso
      playAlertSound();

      // Parpadeo de pestaña — visible desde cualquier otra pestaña, no requiere permiso
      startTitleBlink();

      // Notificación del sistema — solo si el operador aceptó el permiso
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
        const notif = new Notification('🚨 Nueva alerta de pánico', {
          body: 'Toca para ir al módulo de alertas',
          icon: '/favicon.ico',
          tag: 'alerta-panico',
          renotify: true,
        } as NotificationOptions);
        notif.onclick = () => {
          window.focus();
          router.push('/alertas-sjl');
          notif.close();
        };
      }

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
            <span className="relative flex-shrink-0">
              <span className="absolute inset-0 rounded-full bg-red-400 opacity-30 animate-ping" />
              <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40">
                <Smartphone className="h-4 w-4 text-red-600 dark:text-red-400" />
              </span>
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">
                Nueva alerta de pánico
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Toca para ir al módulo →
              </p>
            </div>

            <button
              className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
              aria-label="Cerrar notificación"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
        { duration: 12000, id: 'alerta-panico-nueva' },
      );
    },
  });

  return null;
}
