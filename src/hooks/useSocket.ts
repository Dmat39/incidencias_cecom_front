'use client';

import { useEffect, useCallback } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import type { Incidencia } from '@/types';

type SocketEvent = 'nueva-incidencia' | 'incidencia-actualizada' | 'incidencia-atendida' | 'incidencia-cerrada';

export function useSocket(
  events?: Partial<Record<SocketEvent, (data: Incidencia) => void>>
) {
  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    if (events) {
      Object.entries(events).forEach(([event, handler]) => {
        if (handler) socket.on(event, handler);
      });
    }

    return () => {
      if (events) {
        Object.entries(events).forEach(([event, handler]) => {
          if (handler) socket.off(event, handler);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    getSocket().emit(event, data);
  }, []);

  return { emit };
}
