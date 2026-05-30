'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Search,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';

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

const MODULOS_FILTRO = [
  { key: '',            label: 'Todos'       },
  { key: 'Incidencias', label: 'Incidencias' },
  { key: 'Usuarios',    label: 'Usuarios'    },
  { key: 'Serenos',     label: 'Serenos'     },
  { key: 'Catálogos',   label: 'Catálogos'   },
  { key: 'Evidencias',  label: 'Evidencias'  },
  { key: 'Reportes',    label: 'Reportes'    },
];

const ACCIONES_FILTRO = [
  { key: '',         label: 'Todas'    },
  { key: 'CREAR',    label: 'Crear'    },
  { key: 'EDITAR',   label: 'Editar'   },
  { key: 'ELIMINAR', label: 'Eliminar' },
];

function formatDetalles(entry: AuditoriaEntry): string {
  const d = entry.detalles;
  if (!d) return '—';

  // Para incidencias, mostrar campos clave
  const parts: string[] = [];
  if (d.codigoIncidencia) parts.push(`Cód: ${d.codigoIncidencia}`);
  if (d.direccion)        parts.push(`Dir: ${d.direccion}`);
  if (d.id && !d.codigoIncidencia) parts.push(`ID: ${d.id}`);
  if (d.username)         parts.push(`Usuario: ${d.username}`);
  if (d.nombres)          parts.push(`Nombre: ${d.nombres} ${d.apellidos ?? ''}`);
  if (d.nombre)           parts.push(String(d.nombre));
  if (d.descripcion && !d.codigoIncidencia) parts.push(String(d.descripcion).slice(0, 60));

  return parts.length ? parts.join(' · ') : JSON.stringify(d).slice(0, 120);
}

export default function AuditoriaPage() {
  const [page, setPage]     = useState(1);
  const [limit, setLimit]   = useState(20);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [modulo, setModulo] = useState('');
  const [accion, setAccion] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [modulo, accion]);

  const { data, isLoading } = useQuery({
    queryKey: ['auditoria', page, limit, modulo, debounced, accion],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (modulo)   params.modulo = modulo;
      if (debounced) params.search = debounced;
      if (accion)   params.accion = accion;
      const { data } = await api.get('/auditoria/usuarios', { params });
      return data;
    },
  });

  const entries: AuditoriaEntry[] = data?.data?.data ?? [];
  const meta       = data?.data?.meta;
  const total      = meta?.total      ?? 0;
  const totalPages = meta?.totalPages ?? 1;
  const startRow   = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRow     = Math.min(page * limit, total);

  return (
    <div className="space-y-3">

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Auditoría</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Registro de acciones realizadas en el sistema</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar código, usuario..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Módulo */}
        <div className="flex items-center gap-1 flex-wrap">
          {MODULOS_FILTRO.map((m) => (
            <button
              key={m.key}
              onClick={() => setModulo(m.key)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
                modulo === m.key
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-400'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Acción */}
        <div className="flex items-center gap-1">
          {ACCIONES_FILTRO.map((a) => (
            <button
              key={a.key}
              onClick={() => setAccion(a.key)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
                accion === a.key
                  ? a.key === 'CREAR'    ? 'bg-green-600 text-white border-green-600'
                  : a.key === 'EDITAR'   ? 'bg-blue-600 text-white border-blue-600'
                  : a.key === 'ELIMINAR' ? 'bg-red-600 text-white border-red-600'
                  : 'bg-gray-600 text-white border-gray-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col dark:bg-gray-900">
        <div className="overflow-x-auto rounded-t-lg">
          <div className="overflow-y-auto min-w-[800px]" style={{ height: 'calc(100vh - 300px)' }}>
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-green-600 hover:bg-green-600">
                  {[
                    { label: 'Fecha',            cls: 'min-w-[140px]' },
                    { label: 'Módulo',            cls: 'min-w-[120px]' },
                    { label: 'Acción',            cls: 'min-w-[100px]' },
                    { label: 'Recurso afectado',  cls: 'min-w-[140px]' },
                    { label: 'Realizado por',     cls: 'min-w-[140px]' },
                    { label: 'Detalles',          cls: 'min-w-[260px]' },
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
                      {search || modulo || accion ? 'No hay resultados para los filtros aplicados.' : 'Sin registros de auditoría.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry, idx) => (
                    <TableRow
                      key={entry.id}
                      className={`transition-colors hover:bg-green-50 dark:hover:bg-green-900/15 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/60 dark:bg-gray-800/40'}`}
                    >
                      <TableCell className="py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(entry.createdAt, 'dd/MM/yyyy HH:mm')}
                      </TableCell>
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
                      <TableCell className="py-2.5 text-sm font-medium text-gray-800 dark:text-gray-100 max-w-[140px] truncate" title={entry.usuarioAfectado || ''}>
                        {entry.usuarioAfectado || '—'}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                          {entry.realizadoPor}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-gray-500 dark:text-gray-400 max-w-[260px] truncate" title={entry.detalles ? JSON.stringify(entry.detalles) : ''}>
                        {formatDetalles(entry)}
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
