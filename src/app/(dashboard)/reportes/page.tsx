'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, FileBarChart } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useUnidades, useEstadoIncidencias, useTipoCasos, useTipoCasosByUnidad, useSubTipoCasos, useSubTipoCasosByTipo } from '@/hooks/useCatalogos';

interface ReportFilter {
  fechaInicio?: string;
  fechaFin?: string;
  unidadId?: number;
  situacionId?: number;
  tipoCasoId?: number;
  subTipoCasoId?: number;
}

export default function ReportesPage() {
  const [filters, setFilters] = useState<ReportFilter>({});
  const [loading, setLoading] = useState(false);
  const { data: unidades } = useUnidades();
  const { data: estados } = useEstadoIncidencias();
  const { data: todosTipos }       = useTipoCasos();
  const { data: tiposPorUnidad }   = useTipoCasosByUnidad(filters.unidadId);
  const tiposCaso = filters.unidadId ? tiposPorUnidad : todosTipos;

  const { data: todosSubtipos }    = useSubTipoCasos();
  const { data: subtiposPorTipo }  = useSubTipoCasosByTipo(filters.tipoCasoId);
  const subtipos = filters.tipoCasoId ? subtiposPorTipo : todosSubtipos;

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
