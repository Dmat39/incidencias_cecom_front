'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ClipboardList, Search,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { formatDate } from '@/lib/date';

interface AuditoriaEntry {
  id: number;
  modulo: string;
  accion: 'CREAR' | 'EDITAR' | 'ELIMINAR';
  usuarioAfectado: string;
  realizadoPor: string;
  detalles?: Record<string, unknown>;
  createdAt: string;
}

const PAGE_SIZES = [10, 20, 50, 100];

const ACCION_BADGE: Record<string, string> = {
  CREAR:    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  EDITAR:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  ELIMINAR: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export default function AuditoriaPage() {
  const [page, setPage]   = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch]     = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['auditoria', page, limit],
    queryFn: async () => {
      const { data } = await api.get(`/auditoria/usuarios`, { params: { page, limit } });
      return data;
    },
  });

  const allEntries: AuditoriaEntry[] = data?.data?.data ?? [];
  const meta        = data?.data?.meta;
  const total       = meta?.total      ?? 0;
  const totalPages  = meta?.totalPages ?? 1;
  const startRow    = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRow      = Math.min(page * limit, total);

  // Filtro client-side por búsqueda (módulo, acción, usuario)
  const entries = debounced
    ? allEntries.filter((e) => {
        const q = debounced.toLowerCase();
        return (
          e.modulo.toLowerCase().includes(q) ||
          e.accion.toLowerCase().includes(q) ||
          e.usuarioAfectado.toLowerCase().includes(q) ||
          e.realizadoPor.toLowerCase().includes(q)
        );
      })
    : allEntries;

  return (
    <div className="space-y-3">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Auditoría</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Registro de acciones realizadas en el sistema</p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por módulo, acción o usuario..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col dark:bg-gray-900">
        <div className="overflow-x-auto rounded-t-lg">
          <div className="overflow-y-auto min-w-[800px]" style={{ height: 'calc(100vh - 260px)' }}>
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-green-600 hover:bg-green-600">
                  {[
                    { label: 'Módulo',           cls: 'min-w-[120px]' },
                    { label: 'Acción',           cls: 'min-w-[100px]' },
                    { label: 'Recurso afectado', cls: 'min-w-[120px] max-w-[150px]' },
                    { label: 'Realizado por',    cls: 'min-w-[140px]' },
                    { label: 'Detalles',         cls: 'min-w-[220px]' },
                    { label: 'Fecha',            cls: 'min-w-[140px]' },
                  ].map(({ label, cls }) => (
                    <TableHead key={label} className={`text-white font-semibold text-sm whitespace-nowrap bg-green-600 ${cls}`}>
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/40'}>
                      {[1,2,3,4,5,6].map((j) => (
                        <TableCell key={j}><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      {search ? 'No hay resultados para la búsqueda.' : 'Sin registros de auditoría.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry, idx) => (
                    <TableRow
                      key={entry.id}
                      className={`transition-colors hover:bg-green-50 dark:hover:bg-green-900/15 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/60 dark:bg-gray-800/40'}`}
                    >
                      <TableCell className="py-2.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-medium">
                          {entry.modulo}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ACCION_BADGE[entry.accion] ?? 'bg-gray-100 text-gray-600'}`}>
                          {entry.accion}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-gray-800 dark:text-gray-100 max-w-[150px] truncate" title={entry.usuarioAfectado || ''}>{entry.usuarioAfectado || '—'}</TableCell>
                      <TableCell className="py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200">{entry.realizadoPor}</TableCell>
                      <TableCell className="py-2.5 text-xs text-gray-500 dark:text-gray-400 max-w-[220px] truncate" title={entry.detalles ? JSON.stringify(entry.detalles) : ''}>
                        {entry.detalles ? JSON.stringify(entry.detalles) : '—'}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(entry.createdAt, "dd/MM/yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Paginación */}
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-end gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Filas por página:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="h-7 text-sm border border-gray-300 dark:border-gray-600 rounded px-1 bg-white dark:bg-gray-800 dark:text-gray-300 focus:outline-none"
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{startRow}–{endRow} de {total}</span>
            <div className="flex items-center gap-0.5">
              <button disabled={page <= 1} onClick={() => setPage(1)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
