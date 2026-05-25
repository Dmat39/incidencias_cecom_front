'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIncidencias } from '@/hooks/useIncidencias';
import { useSocket } from '@/hooks/useSocket';
import { useEstadoIncidencias, useUnidades, useJurisdicciones, useSeveridades } from '@/hooks/useCatalogos';
import EstadoBadge, { getEstadoDotColor } from '@/components/incidencias/EstadoBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus, Eye, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Search, Filter,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/date';
import type { FilterIncidenciaDto, Incidencia } from '@/types';

const PAGE_SIZES = [10, 20, 50, 100];

function SeveridadBadge({ descripcion }: { descripcion?: string }) {
  if (!descripcion) return <span className="text-gray-400 text-xs">-</span>;
  const d = descripcion.toLowerCase();
  let cls = 'text-xs font-semibold px-2 py-0.5 rounded-full ';
  if (d.includes('alt'))      cls += 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  else if (d.includes('med')) cls += 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  else if (d.includes('baj')) cls += 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  else                        cls += 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  return <span className={cls}>{descripcion}</span>;
}

export default function IncidenciasPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<FilterIncidenciaDto>({ page: 1, limit: 20 });
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Debounce: envía el texto al backend después de 400ms sin escribir
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchText.trim() || undefined, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data, isLoading, isFetching } = useIncidencias(filters);
  const { data: estados } = useEstadoIncidencias();
  const { data: unidades } = useUnidades();
  const { data: jurisdicciones } = useJurisdicciones();
  const { data: severidades } = useSeveridades();

  useSocket({
    'nueva-incidencia': (inc: Incidencia) => {
      toast.success(`🚨 Nueva incidencia: ${inc.codigoIncidencia}`, { duration: 6000 });
      qc.invalidateQueries({ queryKey: ['incidencias'] });
    },
    'incidencia-actualizada': () => {
      qc.invalidateQueries({ queryKey: ['incidencias'] });
    },
  });

  function updateFilter(key: keyof FilterIncidenciaDto, value: string | number | undefined) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }

  const incidencias = data?.data || [];
  const total       = data?.meta?.total      || 0;
  const totalPages  = data?.meta?.totalPages || 1;
  const currentPage = filters.page || 1;
  const limit       = filters.limit || 20;
  const startRow    = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endRow      = Math.min(currentPage * limit, total);

  const rows = incidencias;

  return (
    <div className="space-y-3">

      {/* ── Encabezado ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Incidencias</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestión y seguimiento de incidencias en tiempo real</p>
        </div>
        <Button onClick={() => router.push('/incidencias/nueva')} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-1.5" /> Nueva incidencia
        </Button>
      </div>

      {/* ── Toolbar: búsqueda + filtros (fuera del borde, igual que catálogos) ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por código, tipo, dirección..."
            className="pl-9 h-9 text-sm"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3 h-9 rounded border text-sm font-medium transition-colors
            ${showFilters ? 'bg-green-50 dark:bg-green-900/25 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        >
          <Filter className="h-4 w-4" /> Filtros
        </button>
      </div>

      {/* ── Filtros expandibles ── */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 items-end p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">Desde</label>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={fechaInicio}
              max={fechaFin || undefined}
              onChange={(e) => {
                setFechaInicio(e.target.value);
                updateFilter('fechaInicio', e.target.value || undefined);
              }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">Hasta</label>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={fechaFin}
              min={fechaInicio || undefined}
              onChange={(e) => {
                setFechaFin(e.target.value);
                updateFilter('fechaFin', e.target.value || undefined);
              }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">Estado</label>
            <Select onValueChange={(v) => updateFilter('situacionId', v === 'all' ? undefined : Number(v))}>
              <SelectTrigger className="h-8 text-sm w-40"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {estados?.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.descripcion}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">Unidad</label>
            <Select onValueChange={(v) => updateFilter('unidadId', v === 'all' ? undefined : Number(v))}>
              <SelectTrigger className="h-8 text-sm w-40"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {unidades?.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.descripcion}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">Jurisdicción</label>
            <Select onValueChange={(v) => updateFilter('jurisdiccionId', v === 'all' ? undefined : Number(v))}>
              <SelectTrigger className="h-8 text-sm w-40"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {jurisdicciones?.map((j) => <SelectItem key={j.id} value={String(j.id)}>{j.descripcion || j.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">Severidad</label>
            <Select onValueChange={(v) => updateFilter('severidadId', v === 'all' ? undefined : Number(v))}>
              <SelectTrigger className="h-8 text-sm w-36"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {severidades?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.descripcion}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <button
            onClick={() => { setFilters({ page: 1, limit, search: undefined }); setSearchText(''); setFechaInicio(''); setFechaFin(''); }}
            className="h-8 px-3 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            Limpiar
          </button>
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col dark:bg-gray-900">
        <div className="overflow-y-auto rounded-t-lg" style={{ height: 'calc(100vh - 290px)' }}>
          <Table className="w-full table-fixed">

            <colgroup>
              <col style={{ width: '110px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '370px' }} />
              <col style={{ width: '280px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '85px' }} />
            </colgroup>

            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-green-600 hover:bg-green-600">
                {['Código', 'Fecha/Hora', 'Unidad', 'Tipo de Caso', 'Dirección', 'Severidad', 'Estado'].map((label) => (
                  <TableHead key={label} className="text-white font-semibold text-sm whitespace-nowrap bg-green-600">
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/40'}>
                    {[1,2,3,4,5,6,7].map((j) => (
                      <TableCell key={j}><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                    {searchText ? 'No hay resultados para la búsqueda.' : 'No hay datos disponibles.'}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((inc: Incidencia, idx: number) => (
                  <TableRow
                    key={inc.id}
                    className={`cursor-pointer transition-colors hover:bg-green-50 dark:hover:bg-green-900/15 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/60 dark:bg-gray-800/40'}`}
                    onClick={() => router.push(`/incidencias/${inc.id}`)}
                  >
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getEstadoDotColor(inc.situacion?.descripcion) }}
                        />
                        <span className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                          {inc.codigoIncidencia || `#${inc.id}`}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap py-2.5">
                      {formatDate(inc.registradoEn, 'dd/MM/yy HH:mm')}
                    </TableCell>

                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap py-2.5">
                      {inc.unidad?.descripcion || '-'}
                    </TableCell>

                    <TableCell className="text-sm text-gray-700 dark:text-gray-300 py-2.5 max-w-0">
                      <p className="truncate" title={
                        inc.tipoCaso?.codigo
                          ? `${inc.tipoCaso.codigo} - ${inc.tipoCaso.descripcion}`
                          : inc.tipoCaso?.descripcion || '-'
                      }>
                        {inc.tipoCaso
                          ? (inc.tipoCaso.codigo ? `${inc.tipoCaso.codigo} - ${inc.tipoCaso.descripcion}` : inc.tipoCaso.descripcion) || '-'
                          : '-'}
                      </p>
                    </TableCell>

                    <TableCell className="text-sm text-gray-600 py-2.5 max-w-0">
                      <p className="truncate" title={inc.direccion || ''}>
                        {inc.direccion || '-'}
                      </p>
                    </TableCell>

                    <TableCell className="py-2.5 whitespace-nowrap">
                      <SeveridadBadge descripcion={inc.severidad?.descripcion} />
                    </TableCell>

                    <TableCell className="py-2.5 whitespace-nowrap">
                      <EstadoBadge estado={inc.situacion?.descripcion} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-end gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 relative">
            {isFetching && (
              <span className="absolute left-4 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border-2 border-gray-300 dark:border-gray-600 border-t-green-500 rounded-full animate-spin" />
                Cargando...
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Filas por página:</span>
              <select
                value={limit}
                onChange={(e) => setFilters((f) => ({ ...f, limit: Number(e.target.value), page: 1 }))}
                className="h-7 text-sm border border-gray-300 dark:border-gray-600 rounded px-1 bg-white dark:bg-gray-800 dark:text-gray-300 focus:outline-none"
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{startRow}–{endRow} de {total}</span>
            <div className="flex items-center gap-0.5">
              <button disabled={currentPage <= 1} onClick={() => setFilters((f) => ({ ...f, page: 1 }))}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed dark:text-gray-400">
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button disabled={currentPage <= 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page||1) - 1 }))}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed dark:text-gray-400">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={currentPage >= totalPages} onClick={() => setFilters((f) => ({ ...f, page: (f.page||1) + 1 }))}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed dark:text-gray-400">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button disabled={currentPage >= totalPages} onClick={() => setFilters((f) => ({ ...f, page: totalPages }))}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed dark:text-gray-400">
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div></div>)}
