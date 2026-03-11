'use client';

import { io, Socket } from 'socket.io-client';

const SVI_SOCKET_URL = process.env.NEXT_PUBLIC_SVI_SOCKET_URL || 'http://localhost:3008';

let socketSvi: Socket | null = null;

export function getSviSocket(token?: string): Socket {
  if (!socketSvi) {
    socketSvi = io(SVI_SOCKET_URL, {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
      autoConnect: false,
    });
  }
  return socketSvi;
}

export function connectSviSocket(token?: string): void {
  const s = getSviSocket(token);
  if (!s.connected) s.connect();
}

export function disconnectSviSocket(): void {
  if (socketSvi?.connected) {
    socketSvi.disconnect();
    socketSvi = null;
  }
}
