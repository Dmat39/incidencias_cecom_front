'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIncidencias } from '@/hooks/useIncidencias';
import { useSocket } from '@/hooks/useSocket';
import { useEstadoIncidencias, useUnidades, useJurisdicciones } from '@/hooks/useCatalogos';
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

export default function IncidenciasPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<FilterIncidenciaDto>({ page: 1, limit: 20 });
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useIncidencias(filters);
  const { data: estados } = useEstadoIncidencias();
  const { data: unidades } = useUnidades();
  const { data: jurisdicciones } = useJurisdicciones();

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

  const rows = searchText.trim()
    ? incidencias.filter((inc: Incidencia) => {
        const q = searchText.toLowerCase();
        return (
          (inc.codigoIncidencia || '').toLowerCase().includes(q) ||
          (inc.direccion || '').toLowerCase().includes(q) ||
          (inc.tipoCaso?.descripcion || '').toLowerCase().includes(q) ||
          (inc.unidad?.descripcion || '').toLowerCase().includes(q)
        );
      })
    : incidencias;

  return (
    <div className="space-y-3">

      {/* ── Encabezado ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Incidencias</h1>
          <p className="text-sm text-gray-500">Gestión y seguimiento de incidencias en tiempo real</p>
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
            ${showFilters ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          <Filter className="h-4 w-4" /> Filtros
        </button>
      </div>

      {/* ── Filtros expandibles ── */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 items-end p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div>
            <label className="text-xs text-gray-500 block mb-1 font-medium">Desde</label>
            <Input type="date" className="h-8 text-sm w-36" onChange={(e) => updateFilter('fechaInicio', e.target.value || undefined)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1 font-medium">Hasta</label>
            <Input type="date" className="h-8 text-sm w-36" onChange={(e) => updateFilter('fechaFin', e.target.value || undefined)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1 font-medium">Estado</label>
            <Select onValueChange={(v) => updateFilter('situacionId', v === 'all' ? undefined : Number(v))}>
              <SelectTrigger className="h-8 text-sm w-40"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {estados?.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.descripcion}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1 font-medium">Unidad</label>
            <Select onValueChange={(v) => updateFilter('unidadId', v === 'all' ? undefined : Number(v))}>
              <SelectTrigger className="h-8 text-sm w-40"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {unidades?.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.descripcion}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1 font-medium">Jurisdicción</label>
            <Select onValueChange={(v) => updateFilter('jurisdiccionId', v === 'all' ? undefined : Number(v))}>
              <SelectTrigger className="h-8 text-sm w-40"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {jurisdicciones?.map((j) => <SelectItem key={j.id} value={String(j.id)}>{j.descripcion || j.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <button
            onClick={() => { setFilters({ page: 1, limit }); setSearchText(''); }}
            className="h-8 px-3 text-xs border border-gray-300 rounded bg-white hover:bg-gray-100 text-gray-500"
          >
            Limpiar
          </button>
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="border rounded-lg shadow-sm flex flex-col">
        <div className="overflow-y-auto rounded-t-lg" style={{ height: 'calc(100vh - 290px)' }}>
          <Table className="w-full table-fixed">

            <colgroup>
              <col style={{ width: '110px' }} />  {/* Código */}
              <col style={{ width: '100px' }} />  {/* Fecha/Hora */}
              <col style={{ width: '100px' }} />   {/* Unidad */}
              <col style={{ width: '470px' }}/>   {/* Tipo de Caso */}
              <col style={{ width: '350px' }} />  {/* Dirección */}
              <col style={{ width: '85px' }} />  {/* Estado */}
            </colgroup>

            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-green-600 hover:bg-green-600">
                {['Código', 'Fecha/Hora', 'Unidad', 'Tipo de Caso', 'Dirección', 'Estado'].map((label) => (
                  <TableHead key={label} className="text-white font-semibold text-sm whitespace-nowrap bg-green-600">
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {[1,2,3,4,5,6].map((j) => (
                      <TableCell key={j}><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    {searchText ? 'No hay resultados para la búsqueda.' : 'No hay datos disponibles.'}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((inc: Incidencia, idx: number) => (
                  <TableRow
                    key={inc.id}
                    className={`cursor-pointer transition-colors hover:bg-green-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}
                    onClick={() => router.push(`/incidencias/${inc.id}`)}
                  >
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getEstadoDotColor(inc.situacion?.descripcion) }}
                        />
                        <span className="font-mono text-sm font-semibold text-gray-800 whitespace-nowrap">
                          {inc.codigoIncidencia || `#${inc.id}`}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-gray-600 whitespace-nowrap py-2.5">
                      {formatDate(inc.registradoEn, 'dd/MM/yy HH:mm')}
                    </TableCell>

                    <TableCell className="text-sm text-gray-600 whitespace-nowrap py-2.5">
                      {inc.unidad?.descripcion || '-'}
                    </TableCell>

                    <TableCell className="text-sm text-gray-700 py-2.5 max-w-0">
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
          <div className="flex items-center justify-end gap-4 px-4 py-2 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 whitespace-nowrap">Filas por página:</span>
              <select
                value={limit}
                onChange={(e) => setFilters((f) => ({ ...f, limit: Number(e.target.value), page: 1 }))}
                className="h-7 text-sm border border-gray-300 rounded px-1 bg-white focus:outline-none"
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <span className="text-sm text-gray-500 whitespace-nowrap">{startRow}–{endRow} de {total}</span>
            <div className="flex items-center gap-0.5">
              <button disabled={currentPage <= 1} onClick={() => setFilters((f) => ({ ...f, page: 1 }))}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button disabled={currentPage <= 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page||1) - 1 }))}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={currentPage >= totalPages} onClick={() => setFilters((f) => ({ ...f, page: (f.page||1) + 1 }))}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button disabled={currentPage >= totalPages} onClick={() => setFilters((f) => ({ ...f, page: totalPages }))}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div></div>)}
