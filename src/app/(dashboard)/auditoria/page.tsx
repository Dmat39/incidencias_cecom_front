'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList } from 'lucide-react';

interface AuditoriaEntry {
  id: number;
  modulo: string;
  accion: 'CREAR' | 'EDITAR' | 'ELIMINAR';
  usuarioAfectado: string;
  realizadoPor: string;
  detalles?: Record<string, any>;
  createdAt: string;
}

const ACCION_BADGE: Record<string, string> = {
  CREAR:    'bg-green-100 text-green-700',
  EDITAR:   'bg-blue-100 text-blue-700',
  ELIMINAR: 'bg-red-100 text-red-700',
};

export default function AuditoriaPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['auditoria', page],
    queryFn: async () => {
      const { data } = await api.get(`/auditoria/usuarios?page=${page}&limit=20`);
      return data;
    },
  });

  const entries: AuditoriaEntry[] = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-green-600" />
        <h1 className="text-xl font-semibold text-gray-800">Auditoría del Sistema</h1>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-green-600 hover:bg-green-600">
              <TableHead className="text-white font-semibold">Módulo</TableHead>
              <TableHead className="text-white font-semibold">Acción</TableHead>
              <TableHead className="text-white font-semibold">Recurso afectado</TableHead>
              <TableHead className="text-white font-semibold">Realizado por</TableHead>
              <TableHead className="text-white font-semibold">Detalles</TableHead>
              <TableHead className="text-white font-semibold">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {[1,2,3,4,5,6].map((j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                  Sin registros de auditoría
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-gray-50">
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                      {entry.modulo}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ACCION_BADGE[entry.accion] ?? 'bg-gray-100 text-gray-600'}`}>
                      {entry.accion}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{entry.usuarioAfectado}</TableCell>
                  <TableCell className="text-sm font-medium text-gray-700">{entry.realizadoPor}</TableCell>
                  <TableCell className="text-xs text-gray-500 max-w-[220px] truncate">
                    {entry.detalles ? JSON.stringify(entry.detalles) : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-gray-600">{page} / {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
