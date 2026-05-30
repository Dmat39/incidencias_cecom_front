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
import { useUnidades, useEstadoIncidencias, useTipoCasos, useTipoCasosByUnidad, useSubTipoCasos, useSubTipoCasosByTipo } from '@/hooks/useCatalogos';

const MapZonaPicker = dynamic(
  () => import('@/components/reportes/MapZonaPicker'),
  { ssr: false, loading: () => <div className="h-[420px] bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-400">Cargando mapa...</div> }
);

interface ReportFilter {
  fechaInicio?: string;
  fechaFin?: string;
  unidadId?: number;
  situacionId?: number;
  tipoCasoId?: number;
  subTipoCasoId?: number;
}

export default function ReportesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.includes('admin') ?? false;

  const [filters, setFilters] = useState<ReportFilter>({});
  const [loading, setLoading] = useState(false);
  const [zonaFechaInicio, setZonaFechaInicio] = useState('2025-01-01');
  const [zonaFechaFin, setZonaFechaFin] = useState('2026-05-27');
  const [zonaLoading, setZonaLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [customPolygon, setCustomPolygon] = useState<[number, number][] | null>(null);
  const { data: unidades } = useUnidades();
  const { data: estados } = useEstadoIncidencias();
  const { data: todosTipos }       = useTipoCasos();
  const { data: tiposPorUnidad }   = useTipoCasosByUnidad(filters.unidadId);
  const tiposCaso = filters.unidadId ? tiposPorUnidad : todosTipos;

  const { data: todosSubtipos }    = useSubTipoCasos();
  const { data: subtiposPorTipo }  = useSubTipoCasosByTipo(filters.tipoCasoId);
  const subtipos = filters.tipoCasoId ? subtiposPorTipo : todosSubtipos;

  function handlePolygonConfirm(polygon: [number, number][]) {
    setCustomPolygon(polygon);
    setShowMap(false);
  }

  async function handleZonaDownload() {
    if (!customPolygon) {
      toast.error('Primero dibuja el perímetro en el mapa');
      return;
    }
    if (!zonaFechaInicio || !zonaFechaFin) {
      toast.error('Selecciona el rango de fechas');
      return;
    }
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

  async function handleDownload() {
    setLoading(true);
    try {
      const response = await api.post('/reportes/excel', filters, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fecha = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
      link.setAttribute('download', `incidencias_${fecha}.xlsx`);
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

  return (
    <div className="max-w-4xl space-y-6">
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
              <Input
                type="date"
                onChange={(e) => setFilters((f) => ({ ...f, fechaInicio: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Fecha fin</Label>
              <Input
                type="date"
                onChange={(e) => setFilters((f) => ({ ...f, fechaFin: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Unidad</Label>
              <Select onValueChange={(v) => setFilters((f) => ({ ...f, unidadId: v === 'all' ? undefined : Number(v), tipoCasoId: undefined, subTipoCasoId: undefined }))}>
                <SelectTrigger><SelectValue placeholder="Todas las unidades" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {unidades?.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.descripcion}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo de caso</Label>
              <Select
                value={filters.tipoCasoId ? String(filters.tipoCasoId) : 'all'}
                onValueChange={(v) => setFilters((f) => ({ ...f, tipoCasoId: v === 'all' ? undefined : Number(v), subTipoCasoId: undefined }))}
              >
                <SelectTrigger><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {tiposCaso?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.descripcion}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Subtipo de caso</Label>
              <Select
                value={filters.subTipoCasoId ? String(filters.subTipoCasoId) : 'all'}
                onValueChange={(v) => setFilters((f) => ({ ...f, subTipoCasoId: v === 'all' ? undefined : Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder="Todos los subtipos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {subtipos?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.descripcion}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select onValueChange={(v) => setFilters((f) => ({ ...f, situacionId: v === 'all' ? undefined : Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="Todos los estados" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {estados?.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.descripcion}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2">
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
                  Descargar Excel
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reporte por Zona Geográfica — solo admin */}
      {isAdmin && <Card className="border border-blue-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5 text-blue-600" />
            Reporte por Zona Geográfica
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Step 1 — Draw perimeter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">1. Definir perímetro</span>
              {customPolygon && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {customPolygon.length} puntos definidos
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMap((v) => !v)}
              className="gap-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              {showMap ? 'Ocultar mapa' : customPolygon ? 'Redibujar zona' : 'Dibujar zona en el mapa'}
            </Button>

            {showMap && (
              <MapZonaPicker onConfirm={handlePolygonConfirm} />
            )}
          </div>

          {/* Step 2 — Date range + download (only when polygon ready) */}
          {customPolygon && !showMap && (
            <div className="space-y-4 pt-2 border-t border-blue-100">
              <span className="text-sm font-medium text-gray-700">2. Seleccionar rango de fechas</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Fecha inicio</Label>
                  <Input
                    type="date"
                    value={zonaFechaInicio}
                    onChange={(e) => setZonaFechaInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Fecha fin</Label>
                  <Input
                    type="date"
                    value={zonaFechaFin}
                    onChange={(e) => setZonaFechaFin(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleZonaDownload}
                disabled={zonaLoading}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 font-semibold"
              >
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
      </Card>}

      <Card className="border border-gray-100 dark:border-gray-700 bg-green-50/40 dark:bg-green-900/10">
        <CardContent className="p-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p className="font-medium text-green-700 dark:text-green-400">Información del reporte:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>Incluye código, fecha, unidad, tipo, dirección, coordenadas (lat/long) y estado de cada incidencia</li>
            <li>Si no se selecciona rango de fechas, se incluyen todas las incidencias</li>
            <li>El archivo se descarga en formato .xlsx compatible con Excel</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
