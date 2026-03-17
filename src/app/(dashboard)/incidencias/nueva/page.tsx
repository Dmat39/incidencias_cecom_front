'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ComboboxSearch } from '@/components/ui/combobox-search';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Phone, MapPin, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateIncidencia } from '@/hooks/useIncidencias';
import {
  useUnidades, useTipoCasosByUnidad, useSubTipoCasosByTipo,
  useMedios, useOperadoresByMedio, useTipoReportantes,
  useSeveridades, useJurisdicciones, useEstadoIncidencias,
} from '@/hooks/useCatalogos';
import type { CatalogoItem } from '@/hooks/useCatalogos';
import type { CreateIncidenciaDto, Incidencia, Sereno } from '@/types';
import { useSerenos } from '@/hooks/useSerenos';
import api from '@/lib/api';
import EvidenciasUploader, { type ArchivoEvidencia } from '@/components/incidencias/EvidenciasUploader';

const MapPicker = dynamic(() => import('@/components/incidencias/MapPicker'), { ssr: false });

const schema = z.object({
  unidadId:          z.number().optional(),
  tipoCasoId:        z.number().optional(),
  subTipoCasoId:     z.number().optional(),
  medioId:           z.number().optional(),
  operadorId:        z.number().optional(),
  tipoReportanteId:  z.number().optional(),
  nombreReportante:  z.string().optional(),
  telefonoReportante:z.string().optional(),
  direccion:         z.string().optional(),
  latitud:           z.number().optional(),
  longitud:          z.number().optional(),
  descripcion:       z.string().optional(),
  ocurridoEn:        z.string().optional(),
  severidadId:       z.number().optional(),
  jurisdiccionId:    z.number().optional(),
  situacionId:       z.number().optional(),
});
type FormData = z.infer<typeof schema>;

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="px-5 py-2.5 bg-gray-100 border-b border-gray-200">
      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{title}</p>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-gray-600">{label}</Label>
      {children}
    </div>
  );
}

export default function NuevaIncidenciaPage() {
  const router = useRouter();
  const createMutation = useCreateIncidencia();
  const [selectedUnidad,      setSelectedUnidad]      = useState<number | undefined>();
  const [selectedTipoCaso,    setSelectedTipoCaso]    = useState<number | undefined>();
  const [selectedMedio,       setSelectedMedio]       = useState<number | undefined>();
  const [severidadAutoFilled,    setSeveridadAutoFilled]    = useState(false);
  const [geocodingLoading,       setGeocodingLoading]       = useState(false);
  const [selectedTipoReportante, setSelectedTipoReportante] = useState<CatalogoItem | null>(null);
  const [serenoQuery,            setSerenoQuery]            = useState('');
  const [showSuggestions,        setShowSuggestions]        = useState(false);
  const [reporterSerenoId,       setReporterSerenoId]       = useState<number | null>(null);
  const [archivosEvidencia,      setArchivosEvidencia]      = useState<ArchivoEvidencia[]>([]);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [jurisdiccionAutoFilled,  setJurisdiccionAutoFilled]  = useState(false);
  const [activeJurisdiccionName,  setActiveJurisdiccionName]  = useState<string | undefined>();
  const geojsonCache = useRef<any>(null);

  async function autoDetectarJurisdiccion(lat: number, lng: number, juris: CatalogoItem[]) {
    try {
      if (!geojsonCache.current) {
        const res = await fetch('/juridiccion.geojson');
        geojsonCache.current = await res.json();
      }
      const { point, booleanPointInPolygon, polygon } = await import('@turf/turf');
      const punto = point([lng, lat]);
      const features: any[] = geojsonCache.current?.features ?? [];
      for (const feat of features) {
        if (!feat.geometry?.coordinates) continue;
        const poly = polygon(feat.geometry.coordinates);
        if (booleanPointInPolygon(punto, poly)) {
          const nombre = (feat.properties?.name ?? '').toLowerCase().trim();
          const match = juris.find((j) =>
            (j.nombre ?? j.descripcion ?? '').toLowerCase().trim() === nombre
          );
          if (match) {
            setActiveJurisdiccionName(feat.properties?.name);
            return match.id;
          }
        }
      }
    } catch { /* silencioso */ }
    setActiveJurisdiccionName(undefined);
    return null;
  }

  const { data: unidades }                                        = useUnidades();
  const { data: tiposCasoFiltrados, isLoading: loadingTipos }    = useTipoCasosByUnidad(selectedUnidad);
  const { data: subTiposFiltrados,  isLoading: loadingSubtipos } = useSubTipoCasosByTipo(selectedTipoCaso);
  const { data: medios }                                          = useMedios();
  const { data: operadoresFiltrados, isLoading: loadingOperadores } = useOperadoresByMedio(selectedMedio);
  const { data: tipoReportantes } = useTipoReportantes();
  const esSerenazgo = (selectedTipoReportante?.descripcion ?? selectedTipoReportante?.nombre ?? '').toLowerCase().includes('seren');
  const { data: serenosData } = useSerenos({
    search:     serenoQuery,
    habilitado: true,
    limit:      8,
    page:       1,
    enabled:    esSerenazgo && serenoQuery.length >= 2,
  });
  const { data: severidades }        = useSeveridades();
  const { data: jurisdicciones }     = useJurisdicciones();
  const { data: estados }            = useEstadoIncidencias();

  const { control, register, handleSubmit, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { onChange: rhfNombreOnChange, ref: nombreRef, name: nombreName, onBlur: rhfNombreOnBlur } = register('nombreReportante');

  const lat = watch('latitud');
  const lng = watch('longitud');

  async function onSubmit(values: FormData) {
    // 1. Crear incidencia — si falla, parar aquí
    if (!values.telefonoReportante?.trim()) {
      values.telefonoReportante = 'No registra teléfono';
    }
    const payload = Object.fromEntries(
      Object.entries(values).filter(([, v]) =>
        v !== undefined && v !== null && v !== '' && !Number.isNaN(v as number)
      )
    ) as CreateIncidenciaDto;

    let inc: Incidencia;
    try {
      inc = await createMutation.mutateAsync(payload);
    } catch {
      toast.error('Error al registrar la incidencia');
      return;
    }

    // 2. Asignar sereno reportante — no crítico
    if (reporterSerenoId && inc.id) {
      try {
        await api.patch(`/incidencias/${inc.id}/serenos`, { serenosIds: [reporterSerenoId] });
      } catch {
        console.warn('No se pudo asignar el sereno reportante');
      }
    }

    // 3. Subir evidencias — no crítico, fallo no bloquea navegación
    let evidenciasError = false;
    for (const archivo of archivosEvidencia) {
      try {
        const fd = new (window.FormData)();
        fd.append('file', archivo.file);
        await api.post(`/incidencias/${inc.id}/evidencias`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } catch {
        evidenciasError = true;
      }
    }

    if (evidenciasError) {
      toast.error('Incidencia registrada, pero algunas evidencias no se subieron');
    } else {
      toast.success(`Incidencia ${inc.codigoIncidencia} registrada`);
    }
    router.push('/incidencias');
  }

  return (
    <div className="max-w-3xl mx-auto pb-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button type="button" variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Nueva Incidencia</h1>
          <p className="text-sm text-gray-500">Complete los datos para registrar una nueva incidencia</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Clasificación */}
        <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
          <SectionTitle title="Clasificación" />
          <div className="p-5 grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ minWidth: 0, width: '100%' }}>
            <Field label="Unidad">
              <Controller name="unidadId" control={control} render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => {
                    const n = Number(v); field.onChange(n);
                    setSelectedUnidad(n);
                    setValue('tipoCasoId', undefined);
                    setValue('subTipoCasoId', undefined);
                    setSelectedTipoCaso(undefined);
                  }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {unidades?.map((u: CatalogoItem) => <SelectItem key={u.id} value={String(u.id)}>{u.descripcion}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </Field>
            </div>

            {/* ✅ Sin div wrapper extra, el Field ya es hijo directo del grid */}
            <div style={{ minWidth: 0, width: '100%' }}>
            <Field label="Tipo de Caso">
              <div className="min-w-0 w-full">
              <Controller name="tipoCasoId" control={control} render={({ field }) => (
                <ComboboxSearch
                  options={(tiposCasoFiltrados ?? []).map((t: CatalogoItem) => ({
                    value: t.id,
                    label: t.codigo ? `${t.codigo} - ${t.descripcion}` : t.descripcion,
                  }))}
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    setSelectedTipoCaso(v);
                    setValue('subTipoCasoId', undefined);
                  }}
                  placeholder={
                    !selectedUnidad ? 'Primero elige unidad'
                    : loadingTipos ? 'Cargando...'
                    : 'Buscar tipo de caso...'
                  }
                  searchPlaceholder="Escribe para buscar..."
                  disabled={!selectedUnidad || loadingTipos}
                />
              )} />
              </div>
            </Field>
            </div>

            <div style={{ minWidth: 0, width: '100%' }}>
            <Field label="Subtipo">
              <div className="min-w-0 overflow-hidden rounded-md">
              <Controller name="subTipoCasoId" control={control} render={({ field }) => (
                <ComboboxSearch
                  options={(subTiposFiltrados ?? []).map((s: CatalogoItem) => ({
                    value: s.id,
                    label: s.codigo ? `${s.codigo} - ${s.descripcion}` : s.descripcion,
                  }))}
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    const subtipo = subTiposFiltrados?.find((s: CatalogoItem) => s.id === v);
                    if (subtipo?.urgencia && severidades?.length) {
                      const urg = subtipo.urgencia.toUpperCase();
                      const match = severidades.find((s: CatalogoItem) => {
                        const desc = (s.descripcion ?? '').toUpperCase();
                        if (urg.includes('CRIT')) return desc.includes('CRIT');
                        if (urg.includes('ALT'))  return desc.includes('ALT');
                        if (urg.includes('MED'))  return desc.includes('MED');
                        if (urg.includes('BAJ'))  return desc.includes('BAJ');
                        return false;
                      });
                      if (match) { setValue('severidadId', match.id); setSeveridadAutoFilled(true); }
                      else setSeveridadAutoFilled(false);
                    } else {
                      setSeveridadAutoFilled(false);
                    }
                  }}
                  placeholder={
                    !selectedTipoCaso ? 'Primero elige tipo'
                    : loadingSubtipos ? 'Cargando...'
                    : 'Buscar subtipo...'
                  }
                  searchPlaceholder="Escribe para buscar..."
                  disabled={!selectedTipoCaso || loadingSubtipos}
                />
              )} />
              </div>
            </Field>
            </div>

            <div style={{ minWidth: 0, width: '100%' }}>
            <Field label={
              <span className="flex items-center gap-1.5">
                Severidad
                {severidadAutoFilled && (
                  <span className="text-xs font-normal text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                    auto
                  </span>
                )}
              </span>
            }>
              <Controller name="severidadId" control={control} render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => { field.onChange(Number(v)); setSeveridadAutoFilled(false); }}>
                  <SelectTrigger className={`h-9 text-sm ${severidadAutoFilled ? 'border-green-400 bg-green-50' : ''}`}>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {severidades?.map((s: CatalogoItem) => <SelectItem key={s.id} value={String(s.id)}>{s.descripcion}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </Field>
            </div>

          </div>
        </div>

        {/* Canal de Reporte */}
        <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
          <SectionTitle title="Canal de Reporte" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Medio de Comunicación">
              <Controller name="medioId" control={control} render={({ field }) => (
                <Select onValueChange={(v) => {
                  const n = Number(v); field.onChange(n);
                  setSelectedMedio(n);
                  setValue('operadorId', undefined);
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {medios?.map((m: CatalogoItem) => <SelectItem key={m.id} value={String(m.id)}>{m.descripcion}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </Field>

            <Field label="Operador">
              <Controller name="operadorId" control={control} render={({ field }) => (
                <Select
                  key={`op-${selectedMedio}`}
                  value={field.value ? String(field.value) : undefined}
                  disabled={!selectedMedio || loadingOperadores}
                  onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={
                      !selectedMedio ? 'Primero elige medio'
                      : loadingOperadores ? 'Cargando...'
                      : 'Seleccionar...'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {operadoresFiltrados?.map((o: CatalogoItem) => <SelectItem key={o.id} value={String(o.id)}>{o.descripcion}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </Field>
          </div>
        </div>

        {/* Datos del Reportante */}
        <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
          <SectionTitle title="Datos del Reportante" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Tipo de Reportante">
              <Controller name="tipoReportanteId" control={control} render={({ field }) => (
                <Select onValueChange={(v) => {
                  field.onChange(Number(v));
                  const item = tipoReportantes?.find((t: CatalogoItem) => t.id === Number(v)) ?? null;
                  setSelectedTipoReportante(item);
                  setSerenoQuery('');
                  setShowSuggestions(false);
                  setReporterSerenoId(null);
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {tipoReportantes?.map((t: CatalogoItem) => <SelectItem key={t.id} value={String(t.id)}>{t.descripcion}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </Field>

            <Field label="Nombre del Reportante">
              <div className="relative">
                <Input
                  name={nombreName}
                  ref={nombreRef}
                  placeholder="Nombre completo"
                  className="h-9 text-sm"
                  autoComplete="off"
                  onChange={(e) => {
                    rhfNombreOnChange(e);
                    if (!esSerenazgo) return;
                    const val = e.target.value.trim();
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    if (val.length < 2) {
                      setShowSuggestions(false);
                      setSerenoQuery('');
                      setReporterSerenoId(null);
                      return;
                    }
                    debounceRef.current = setTimeout(() => {
                      setSerenoQuery(val);
                      setShowSuggestions(true);
                    }, 300);
                  }}
                  onBlur={(e) => {
                    rhfNombreOnBlur(e);
                    setTimeout(() => setShowSuggestions(false), 150);
                  }}
                />
                {showSuggestions && esSerenazgo && (serenosData?.data ?? []).length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto"
                  >
                    {(serenosData?.data ?? []).map((s: Sereno) => {
                      const nombre = `${s.nombres ?? ''} ${s.apellidoPaterno ?? ''} ${s.apellidoMaterno ?? ''}`.trim();
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex flex-col"
                          onMouseDown={() => {
                            setValue('nombreReportante', nombre);
                            setReporterSerenoId(s.id);
                            setShowSuggestions(false);
                            setSerenoQuery('');
                          }}
                        >
                          <span className="font-medium text-gray-800">{nombre}</span>
                          {s.dni && <span className="text-xs text-gray-400">DNI: {s.dni}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Field>

            <div className="col-span-1">
              <Field label="Teléfono">
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input placeholder="Número de contacto" className="h-9 text-sm pl-8" {...register('telefonoReportante')} />
                </div>
              </Field>
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
          <SectionTitle title="Ubicación del Incidente" />
          <div className="p-5 space-y-4">
            <Field label="Dirección">
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder={geocodingLoading ? 'Obteniendo dirección...' : 'Dirección exacta del incidente'}
                  className={`h-9 text-sm pl-8 pr-8 ${geocodingLoading ? 'text-gray-400' : ''}`}
                  {...register('direccion')}
                />
                {geocodingLoading && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              <p className="text-xs text-gray-400">Haz clic en el mapa para auto-completar la dirección</p>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Latitud">
                <Input
                  type="number" step="any" placeholder="-11.9699"
                  className="h-9 text-sm"
                  value={lat ?? ''}
                  onChange={(e) => setValue('latitud', parseFloat(e.target.value) || undefined)}
                />
              </Field>
              <Field label="Longitud">
                <Input
                  type="number" step="any" placeholder="-76.9980"
                  className="h-9 text-sm"
                  value={lng ?? ''}
                  onChange={(e) => setValue('longitud', parseFloat(e.target.value) || undefined)}
                />
              </Field>
            </div>

            <div>
              <div className="rounded border border-gray-200 overflow-hidden" style={{ height: 480 }}>
                <MapPicker
                  lat={lat}
                  lng={lng}
                  activeJurisdiccionName={activeJurisdiccionName}
                  onSelect={async (l, lo, address) => {
                    setValue('latitud', l);
                    setValue('longitud', lo);
                    if (address) setValue('direccion', address);
                    const jurisdiccionId = await autoDetectarJurisdiccion(l, lo, jurisdicciones ?? []);
                    if (jurisdiccionId) {
                      setValue('jurisdiccionId', jurisdiccionId);
                      setJurisdiccionAutoFilled(true);
                    } else {
                      setJurisdiccionAutoFilled(false);
                    }
                  }}
                  onLoading={setGeocodingLoading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
          <SectionTitle title="Descripción" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Descripción del incidente">
                <Textarea
                  placeholder="Describe qué ocurrió, cómo ocurrió, personas involucradas..."
                  rows={3}
                  className="text-sm resize-none"
                  {...register('descripcion')}
                />
              </Field>
            </div>
            <Field label="Fecha y Hora de Ocurrencia">
              <div className="relative">
                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <Input
                  type="datetime-local"
                  className="h-9 text-sm pl-8 [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  {...register('ocurridoEn')}
                />
              </div>
              <p className="text-xs text-gray-400">Si no se indica, se usará la hora de registro</p>
            </Field>
          </div>
        </div>

        {/* Evidencias */}
        <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
          <SectionTitle title="Evidencias (opcional)" />
          <div className="p-5">
            <EvidenciasUploader
              archivos={archivosEvidencia}
              onChange={setArchivosEvidencia}
            />
          </div>
        </div>

        {/* Clasificación Final */}
        <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
          <SectionTitle title="Clasificación Final" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label={
              <span className="flex items-center gap-1.5">
                Jurisdicción
                {jurisdiccionAutoFilled && (
                  <span className="text-xs font-normal text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    auto
                  </span>
                )}
              </span>
            }>
              <Controller name="jurisdiccionId" control={control} render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => { field.onChange(Number(v)); setJurisdiccionAutoFilled(false); }}>
                  <SelectTrigger className={`h-9 text-sm ${jurisdiccionAutoFilled ? 'border-blue-400 bg-blue-50' : ''}`}>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jurisdicciones?.map((j: CatalogoItem) => <SelectItem key={j.id} value={String(j.id)}>{j.descripcion || j.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </Field>

            <Field label="Estado inicial">
              <Controller name="situacionId" control={control} render={({ field }) => (
                <Select onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {estados?.map((e: CatalogoItem) => <SelectItem key={e.id} value={String(e.id)}>{e.descripcion}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </Field>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700 min-w-40"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Registrando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" /> Registrar Incidencia
              </span>
            )}
          </Button>
        </div>

      </form>
    </div>
  );
}
