'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, FileBarChart, MapPin, Pencil, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUnidades, useEstadoIncidencias, useTipoCasos, useTipoCasosByUnidad, useSubTipoCasos, useJurisdicciones } from '@/hooks/useCatalogos';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';

const MapZonaPicker = dynamic(
  () => import('@/components/reportes/MapZonaPicker'),
  { ssr: false, loading: () => <div className="h-[420px] bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-400">Cargando mapa...</div> }
);

interface ReportFilter {
  fechaInicio?: string;
  fechaFin?: string;
  unidadId?: number;
  situacionId?: number;
  tipoCasoIds?: number[];
  subTipoCasoIds?: number[];
  jurisdiccionId?: number;
}

export default function ReportesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.includes('admin') ?? false;

  const [filters, setFilters] = useState<ReportFilter>({});
  const [loading, setLoading] = useState(false);
  const [zonaFechaInicio, setZonaFechaInicio] = useState('2025-01-01');
  const [zonaFechaFin, setZonaFechaFin] = useState('2026-12-31');
  const [zonaLoading, setZonaLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [customPolygon, setCustomPolygon] = useState<[number, number][] | null>(null);

  const { data: unidades }       = useUnidades();
  const { data: jurisdicciones } = useJurisdicciones();
  const { data: estados }        = useEstadoIncidencias();
  const { data: todosTipos }     = useTipoCasos();
  const { data: tiposPorUnidad } = useTipoCasosByUnidad(filters.unidadId);
  const tiposCaso = filters.unidadId ? tiposPorUnidad : todosTipos;
  const { data: todosSubtipos }  = useSubTipoCasos();

  // Subtipos agrupados cuando hay tipos seleccionados
  const subtipoGroups = (() => {
    const all = todosSubtipos ?? [];
    const selectedTipos = filters.tipoCasoIds ?? [];
    if (selectedTipos.length === 0) return undefined;
    const delTipo = all.filter((s) => s.tipoCasoId && selectedTipos.includes(s.tipoCasoId));
    const otros   = all.filter((s) => !s.tipoCasoId || !selectedTipos.includes(s.tipoCasoId));
    const grupos = [];
    if (delTipo.length > 0) grupos.push({ label: 'De los tipos seleccionados', options: delTipo.map((s) => ({ id: s.id, label: s.descripcion ?? '' })) });
    if (otros.length   > 0) grupos.push({ label: 'Otros subtipos',             options: otros.map((s)    => ({ id: s.id, label: s.descripcion ?? '' })) });
    return grupos;
  })();

  function handlePolygonConfirm(polygon: [number, number][]) {
    setCustomPolygon(polygon);
    setShowMap(false);
  }

  async function handleDownload() {
    setLoading(true);
    try {
      const response = await api.post('/reportes/excel-completo', filters, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fecha = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
      link.setAttribute('download', `reporte_completo_${fecha}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte descargado');
    } catch {
      toast.error('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  }

  async function handleZonaDownload() {
    if (!customPolygon) { toast.error('Primero dibuja el perímetro en el mapa'); return; }
    if (!zonaFechaInicio || !zonaFechaFin) { toast.error('Selecciona el rango de fechas'); return; }
    setZonaLoading(true);
    try {
      const response = await api.post(
        '/reportes/excel-zona',
        { fechaInicio: zonaFechaInicio, fechaFin: zonaFechaFin, polygon: customPolygon },
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fecha = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
      link.setAttribute('download', `reporte_zona_${fecha}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte de zona descargado');
    } catch {
      toast.error('Error al generar el reporte de zona');
    } finally {
      setZonaLoading(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">

      {/* Reporte Completo */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileBarChart className="h-5 w-5 text-green-600" />
            Reporte de Incidencias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Fecha inicio</Label>
              <Input type="date" onChange={(e) => setFilters((f) => ({ ...f, fechaInicio: e.target.value || undefined }))} />
            </div>
            <div className="space-y-1">
              <Label>Fecha fin</Label>
              <Input type="date" onChange={(e) => setFilters((f) => ({ ...f, fechaFin: e.target.value || undefined }))} />
            </div>
            <div className="space-y-1">
              <Label>Unidad</Label>
              <Select onValueChange={(v) => setFilters((f) => ({ ...f, unidadId: v === 'all' ? undefined : Number(v), tipoCasoIds: undefined, subTipoCasoIds: undefined }))}>
                <SelectTrigger><SelectValue placeholder="Todas las unidades" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {unidades?.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.descripcion}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Zona / Jurisdicción</Label>
              <Select onValueChange={(v) => setFilters((f) => ({ ...f, jurisdiccionId: v === 'all' ? undefined : Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="Todas las zonas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {jurisdicciones?.map((j) => <SelectItem key={j.id} value={String(j.id)}>{j.nombre ?? j.descripcion}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo de caso</Label>
              <MultiSelectFilter
                options={(tiposCaso ?? []).map((t) => ({ id: t.id, label: t.codigo ? `${t.codigo} - ${t.descripcion ?? ''}` : (t.descripcion ?? '') }))}
                selected={filters.tipoCasoIds ?? []}
                onChange={(ids) => setFilters((f) => ({ ...f, tipoCasoIds: ids.length ? ids : undefined, subTipoCasoIds: undefined }))}
                placeholder="Todos los tipos"
                singularLabel="tipo"
                pluralLabel="tipos"
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <Label>Subtipo de caso</Label>
              <MultiSelectFilter
                options={subtipoGroups ? undefined : (todosSubtipos ?? []).map((s) => ({ id: s.id, label: s.descripcion ?? '' }))}
                groups={subtipoGroups}
                selected={filters.subTipoCasoIds ?? []}
                onChange={(ids) => setFilters((f) => ({ ...f, subTipoCasoIds: ids.length ? ids : undefined }))}
                placeholder="Todos los subtipos"
                singularLabel="subtipo"
                pluralLabel="subtipos"
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select onValueChange={(v) => setFilters((f) => ({ ...f, situacionId: v === 'all' ? undefined : Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="Todos los estados" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {estados?.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.descripcion}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p className="font-medium text-gray-700 dark:text-gray-200">El Excel incluye 4 hojas:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><span className="font-medium">Por Tipo de Caso</span> — total de incidencias por cada tipo</li>
              <li><span className="font-medium">Por Subtipo de Caso</span> — desglose por cada subtipo</li>
              <li><span className="font-medium">Por Zona</span> — total por jurisdicción / zona de intervención</li>
              <li><span className="font-medium">Detalle Incidencias</span> — listado completo con todos los campos</li>
            </ul>
          </div>

          <Button
            onClick={handleDownload}
            disabled={loading}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Generando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FileDown className="h-4 w-4" />
                Descargar Reporte Excel
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Reporte por Zona Geográfica — solo admin */}
      {isAdmin && (
        <Card className="border border-blue-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5 text-blue-600" />
              Reporte por Perímetro Dibujado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">1. Definir perímetro en el mapa</span>
                {customPolygon && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {customPolygon.length} puntos definidos
                  </span>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowMap((v) => !v)} className="gap-2">
                <Pencil className="h-3.5 w-3.5" />
                {showMap ? 'Ocultar mapa' : customPolygon ? 'Redibujar zona' : 'Dibujar zona en el mapa'}
              </Button>
              {showMap && <MapZonaPicker onConfirm={handlePolygonConfirm} />}
            </div>

            {customPolygon && !showMap && (
              <div className="space-y-4 pt-2 border-t border-blue-100">
                <span className="text-sm font-medium text-gray-700">2. Seleccionar rango de fechas</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Fecha inicio</Label>
                    <Input type="date" value={zonaFechaInicio} onChange={(e) => setZonaFechaInicio(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Fecha fin</Label>
                    <Input type="date" value={zonaFechaFin} onChange={(e) => setZonaFechaFin(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleZonaDownload} disabled={zonaLoading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 font-semibold">
                  {zonaLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Generando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <FileDown className="h-4 w-4" />
                      Descargar Excel de la Zona
                    </span>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
