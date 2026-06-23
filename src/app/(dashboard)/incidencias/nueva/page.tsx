'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { ArrowLeft, Save, Phone, MapPin, Clock, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateIncidencia } from '@/hooks/useIncidencias';
import {
  useUnidades, useTipoCasosByUnidad, useSubTipoCasosByTipo,
  useMedios, useOperadores, useTipoReportantes,
  useSeveridades, useJurisdicciones, useEstadoIncidencias,
} from '@/hooks/useCatalogos';
import type { CatalogoItem } from '@/hooks/useCatalogos';
import type { CreateIncidenciaDto, Incidencia } from '@/types';
import { useGestionate } from '@/hooks/useGestionate';
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
    <div className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{title}</p>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-gray-600 dark:text-gray-400">{label}</Label>
      {children}
    </div>
  );
}

export default function NuevaIncidenciaPage() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const createMutation = useCreateIncidencia();

  // Pre-fill data coming from alertas-sjl ("Crear incidencia")
  const prefill = useMemo(() => {
    if (!searchParams) return {};
    return {
      nombre:            searchParams.get('nombre')          ?? undefined,
      telefono:          searchParams.get('telefono')        ?? undefined,
      lat:               searchParams.get('lat')     ? parseFloat(searchParams.get('lat')!)  : undefined,
      lng:               searchParams.get('lng')     ? parseFloat(searchParams.get('lng')!)  : undefined,
      direccion:         searchParams.get('direccion')       ?? undefined,
      medioId:           searchParams.get('medioId')          ? parseInt(searchParams.get('medioId')!)          : undefined,
      tipoReportanteId:  searchParams.get('tipoReportanteId') ? parseInt(searchParams.get('tipoReportanteId')!) : undefined,
      ocurridoEn:        searchParams.get('ocurridoEn')      ?? undefined,
      origen:            searchParams.get('origen')          ?? undefined,
      panicAlertId:      searchParams.get('panicAlertId')     ? parseInt(searchParams.get('panicAlertId')!)     : undefined,
    };
  }, [searchParams]);

  const [selectedUnidad,      setSelectedUnidad]      = useState<number | undefined>();
  const [selectedTipoCaso,    setSelectedTipoCaso]    = useState<number | undefined>();
  const [selectedMedio,       setSelectedMedio]       = useState<number | undefined>(prefill.medioId);
  const [severidadAutoFilled,    setSeveridadAutoFilled]    = useState(false);
  const [geocodingLoading,       setGeocodingLoading]       = useState(false);
  const [selectedTipoReportante, setSelectedTipoReportante] = useState<CatalogoItem | null>(null);
  const [serenoDni,              setSerenoDni]              = useState('');
  const [manualNombre,           setManualNombre]           = useState('');
  const [serenoSearchMode,       setSerenoSearchMode]       = useState<'dni' | 'nombre'>('dni');
  const [serenoNombreQuery,      setSerenoNombreQuery]      = useState('');
  const [archivosEvidencia,      setArchivosEvidencia]      = useState<ArchivoEvidencia[]>([]);
  const debounceRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nombreDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { personal: personalGestionate, fuente: gestionateFuente, loading: gestionateLoading, notFound: gestionateNotFound, nombreResults: serenoNombreResults, nombreLoading: serenoNombreLoading, buscarPorDni, buscarPorNombre, seleccionarPorNombre, guardarLocal, limpiar: limpiarGestionate } = useGestionate();
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
  const { data: operadoresFiltrados, isLoading: loadingOperadores } = useOperadores();
  const { data: tipoReportantes } = useTipoReportantes();
  const esSerenazgo = (selectedTipoReportante?.descripcion ?? selectedTipoReportante?.nombre ?? '').toLowerCase().includes('seren');
  const { data: severidades }        = useSeveridades();
  const { data: jurisdicciones }     = useJurisdicciones();
  const { data: estados }            = useEstadoIncidencias();

  const { control, register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombreReportante:   prefill.nombre,
      telefonoReportante: prefill.telefono,
      latitud:            prefill.lat,
      longitud:           prefill.lng,
      direccion:          prefill.direccion,
      medioId:            prefill.medioId,
      tipoReportanteId:   prefill.tipoReportanteId,
      ocurridoEn:         prefill.ocurridoEn,
    },
  });

  const { onChange: rhfNombreOnChange, ref: nombreRef, name: nombreName, onBlur: rhfNombreOnBlur } = register('nombreReportante');

  const lat = watch('latitud');
  const lng = watch('longitud');

  // Auto-rellenar nombreReportante cuando se encuentra en Gestionate o local
  useEffect(() => {
    if (!personalGestionate || !gestionateFuente) return;
    const nombre = gestionateFuente === 'LOCAL'
      ? personalGestionate.nombres
      : `${personalGestionate.nombres} ${personalGestionate.apellidos}`.trim();
    setValue('nombreReportante', nombre);
  }, [personalGestionate, gestionateFuente, setValue]);

  // Sync tipoReportante state when pre-filling from URL (catalog loads after mount)
  useEffect(() => {
    if (!prefill.tipoReportanteId || !tipoReportantes?.length) return;
    const item = tipoReportantes.find((t: CatalogoItem) => t.id === prefill.tipoReportanteId) ?? null;
    if (item) setSelectedTipoReportante(item);
  }, [prefill.tipoReportanteId, tipoReportantes]);

  // Auto-detect jurisdiction when pre-filling lat/lng from URL
  const jurisdiccionPrefillDone = useRef(false);
  useEffect(() => {
    if (jurisdiccionPrefillDone.current) return;
    if (!prefill.lat || !prefill.lng || !jurisdicciones?.length) return;
    jurisdiccionPrefillDone.current = true;
    autoDetectarJurisdiccion(prefill.lat, prefill.lng, jurisdicciones).then((id) => {
      if (id) { setValue('jurisdiccionId', id); setJurisdiccionAutoFilled(true); }
    });
  }, [prefill.lat, prefill.lng, jurisdicciones]);

  // Auto-geocode dirección cuando viene lat/lng pero sin dirección (la app solo envía coordenadas)
  const direccionPrefillDone = useRef(false);
  useEffect(() => {
    if (direccionPrefillDone.current) return;
    if (!prefill.lat || !prefill.lng) return;
    if (prefill.direccion) {
      // Ya tenemos dirección del URL, no geocodificar
      direccionPrefillDone.current = true;
      return;
    }
    direccionPrefillDone.current = true;
    setGeocodingLoading(true);
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${prefill.lat}&lon=${prefill.lng}&accept-language=es`,
      { headers: { 'Accept-Language': 'es' } },
    )
      .then((r) => r.json())
      .then((json) => {
        const a = json.address ?? {};
        const parts: string[] = [];
        const road = a.road ?? a.pedestrian ?? a.footway ?? a.path ?? '';
        if (road) parts.push(road);
        if (a.house_number) parts.push(a.house_number);
        const area = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? '';
        if (area) parts.push(area);
        const city = a.city ?? a.town ?? a.village ?? a.municipality ?? '';
        if (city && city !== area) parts.push(city);
        const address = parts.join(', ') || json.display_name || '';
        if (address) setValue('direccion', address);
      })
      .catch(() => {})
      .finally(() => setGeocodingLoading(false));
  }, [prefill.lat, prefill.lng, prefill.direccion]);

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

    // Adjuntar fuente del reportante cuando es serenazgo
    if (esSerenazgo) {
      payload.reportanteFuente = gestionateFuente ?? 'MANUAL';
    }

    // Vincular con alerta de pánico para que el backend la marque como atendida
    if (prefill.panicAlertId) {
      const sufijo = `\nID Alerta App: #${prefill.panicAlertId}`;
      payload.descripcion = payload.descripcion
        ? `${payload.descripcion}${sufijo}`
        : sufijo.trim();
    }

    let inc: Incidencia;
    try {
      inc = await createMutation.mutateAsync(payload);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al registrar la incidencia';
      toast.error(msg);
      return;
    }

    // 2. Si el sereno fue ingresado manualmente, guardarlo en local para futuras búsquedas
    if (esSerenazgo && gestionateNotFound && serenoDni && manualNombre.trim()) {
      await guardarLocal(serenoDni, manualNombre.trim());
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
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Nueva Incidencia</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Complete los datos para registrar una nueva incidencia</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={createMutation.isPending || isSubmitting} className="contents">

        {/* Banner: datos pre-cargados desde alerta de pánico */}
        {prefill.origen === 'panico' && (
          <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
            <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Datos pre-cargados desde App Vecino Seguro SJL</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Reportante, teléfono, GPS y hora ya están completados. Solo elige la <strong>clasificación</strong> y confirma.
              </p>
            </div>
          </div>
        )}

        {/* Clasificación */}
        <div className="bg-white dark:bg-gray-900 rounded shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                    label: t.codigo ? `${t.codigo} - ${t.descripcion ?? ''}` : (t.descripcion ?? ''),
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
              <div className="min-w-0 w-full">
              <Controller name="subTipoCasoId" control={control} render={({ field }) => (
                <ComboboxSearch
                  options={(subTiposFiltrados ?? []).map((s: CatalogoItem) => ({
                    value: s.id,
                    label: s.codigo ? `${s.codigo} - ${s.descripcion ?? ''}` : (s.descripcion ?? ''),
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
                  <span className="text-xs font-normal text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                    auto
                  </span>
                )}
              </span>
            }>
              <Controller name="severidadId" control={control} render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => { field.onChange(Number(v)); setSeveridadAutoFilled(false); }}>
                  <SelectTrigger className={`h-9 text-sm ${severidadAutoFilled ? 'border-green-400 bg-green-50 dark:bg-green-900/30 dark:border-green-500' : ''}`}>
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
        <div className="bg-white dark:bg-gray-900 rounded shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <SectionTitle title="Canal de Reporte" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Medio de Comunicación">
              <Controller name="medioId" control={control} render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => {
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
                  value={field.value ? String(field.value) : undefined}
                  disabled={loadingOperadores}
                  onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={loadingOperadores ? 'Cargando...' : 'Seleccionar...'} />
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
        <div className="bg-white dark:bg-gray-900 rounded shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <SectionTitle title="Datos del Reportante" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Tipo de Reportante">
              <Controller name="tipoReportanteId" control={control} render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => {
                    field.onChange(Number(v));
                    const item = tipoReportantes?.find((t: CatalogoItem) => t.id === Number(v)) ?? null;
                    setSelectedTipoReportante(item);
                    setSerenoDni('');
                    setManualNombre('');
                    setSerenoSearchMode('dni');
                    setSerenoNombreQuery('');
                    limpiarGestionate();
                    setValue('nombreReportante', '');
                  }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {tipoReportantes?.map((t: CatalogoItem) => <SelectItem key={t.id} value={String(t.id)}>{t.descripcion}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </Field>

            {esSerenazgo ? (
              <Field label="Buscar Sereno">
                <div className="space-y-2">
                  {/* Toggle DNI / Nombre */}
                  <div className="flex border border-gray-200 rounded overflow-hidden text-xs">
                    <button
                      type="button"
                      className={`flex-1 py-1.5 font-medium transition-colors ${serenoSearchMode === 'dni' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      onClick={() => {
                        setSerenoSearchMode('dni');
                        setSerenoNombreQuery('');
                        limpiarGestionate();
                        setManualNombre('');
                        setValue('nombreReportante', '');
                      }}
                    >
                      Por DNI
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-1.5 font-medium transition-colors ${serenoSearchMode === 'nombre' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      onClick={() => {
                        setSerenoSearchMode('nombre');
                        setSerenoDni('');
                        limpiarGestionate();
                        setManualNombre('');
                        setValue('nombreReportante', '');
                      }}
                    >
                      Por Nombre
                    </button>
                  </div>

                  {/* Búsqueda por DNI */}
                  {serenoSearchMode === 'dni' && (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <Input
                          placeholder="8 dígitos"
                          className="h-9 text-sm"
                          maxLength={8}
                          value={serenoDni}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setSerenoDni(val);
                            if (val.length < 8) {
                              limpiarGestionate();
                              setManualNombre('');
                              setValue('nombreReportante', '');
                            }
                            if (debounceRef.current) clearTimeout(debounceRef.current);
                            if (val.length === 8) {
                              debounceRef.current = setTimeout(() => buscarPorDni(val), 300);
                            }
                          }}
                        />
                        {gestionateLoading && (
                          <span className="flex items-center text-xs text-gray-400">Buscando...</span>
                        )}
                      </div>

                      {/* Encontrado en Gestionate */}
                      {personalGestionate && gestionateFuente === 'GESTIONATE' && (
                        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm">
                          <p className="font-medium text-green-800">
                            {personalGestionate.nombres} {personalGestionate.apellidos}
                          </p>
                          <p className="text-xs text-green-600">{personalGestionate.cargo} · {personalGestionate.subgerencia}</p>
                        </div>
                      )}

                      {/* Encontrado en tabla local */}
                      {personalGestionate && gestionateFuente === 'LOCAL' && (
                        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                          <p className="font-medium text-blue-800">
                            {personalGestionate.nombres} {personalGestionate.apellidos}
                          </p>
                          <p className="text-xs text-blue-500">Registrado localmente</p>
                        </div>
                      )}

                      {/* No encontrado en ninguna fuente — ingreso manual */}
                      {gestionateNotFound && (
                        <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                          <p className="text-xs text-amber-700 font-medium">No encontrado — ingresa el nombre</p>
                          <Input
                            placeholder="Nombre completo"
                            className="h-8 text-sm bg-white"
                            value={manualNombre}
                            onChange={(e) => {
                              setManualNombre(e.target.value);
                              setValue('nombreReportante', e.target.value);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Búsqueda por Nombre (solo local) */}
                  {serenoSearchMode === 'nombre' && (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nombre o apellido..."
                          className="h-9 text-sm"
                          value={serenoNombreQuery}
                          onChange={(e) => {
                            const q = e.target.value;
                            setSerenoNombreQuery(q);
                            limpiarGestionate();
                            setValue('nombreReportante', '');
                            if (nombreDebounceRef.current) clearTimeout(nombreDebounceRef.current);
                            if (q.length >= 2) {
                              nombreDebounceRef.current = setTimeout(() => buscarPorNombre(q), 300);
                            }
                          }}
                        />
                        {serenoNombreLoading && (
                          <span className="flex items-center text-xs text-gray-400">Buscando...</span>
                        )}
                      </div>

                      {/* Lista de resultados */}
                      {serenoNombreResults.length > 0 && !personalGestionate && (
                        <div className="rounded border border-gray-200 divide-y divide-gray-100 max-h-44 overflow-y-auto shadow-sm">
                          {serenoNombreResults.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                              onClick={() => {
                                seleccionarPorNombre(s);
                                const nombreCompleto = `${s.nombres} ${s.apellidos}`.trim();
                                setValue('nombreReportante', nombreCompleto);
                                setSerenoNombreQuery(nombreCompleto);
                              }}
                            >
                              <p className="font-medium text-gray-800">{s.nombres} {s.apellidos}</p>
                              {(s.dni || s.cargo) && (
                                <p className="text-xs text-gray-500">
                                  {s.dni && `DNI: ${s.dni}`}{s.dni && s.cargo && ' · '}{s.cargo}
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Sereno seleccionado */}
                      {personalGestionate && gestionateFuente === 'LOCAL' && (
                        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                          <p className="font-medium text-blue-800">
                            {personalGestionate.nombres} {personalGestionate.apellidos}
                          </p>
                          <p className="text-xs text-blue-500">
                            {personalGestionate.dni && `DNI: ${personalGestionate.dni}`}
                            {personalGestionate.dni && personalGestionate.cargo && ' · '}
                            {personalGestionate.cargo}
                          </p>
                        </div>
                      )}

                      {serenoNombreQuery.length >= 2 && !serenoNombreLoading && serenoNombreResults.length === 0 && !personalGestionate && (
                        <p className="text-xs text-gray-400 px-1">Sin resultados en la tabla local</p>
                      )}
                    </div>
                  )}
                </div>
              </Field>
            ) : (
              <Field label="Nombre del Reportante">
                <Input
                  name={nombreName}
                  ref={nombreRef}
                  placeholder="Nombre completo"
                  className="h-9 text-sm"
                  onChange={rhfNombreOnChange}
                  onBlur={rhfNombreOnBlur}
                />
              </Field>
            )}

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
        <div className="bg-white dark:bg-gray-900 rounded shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
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
        <div className="bg-white dark:bg-gray-900 rounded shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
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
        <div className="bg-white dark:bg-gray-900 rounded shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <SectionTitle title="Evidencias (opcional)" />
          <div className="p-5">
            <EvidenciasUploader
              archivos={archivosEvidencia}
              onChange={setArchivosEvidencia}
            />
          </div>
        </div>

        {/* Clasificación Final */}
        <div className="bg-white dark:bg-gray-900 rounded shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <SectionTitle title="Clasificación Final" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label={
              <span className="flex items-center gap-1.5">
                Jurisdicción
                {jurisdiccionAutoFilled && (
                  <span className="text-xs font-normal text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                    auto
                  </span>
                )}
              </span>
            }>
              <Controller name="jurisdiccionId" control={control} render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => { field.onChange(Number(v)); setJurisdiccionAutoFilled(false); }}>
                  <SelectTrigger className={`h-9 text-sm ${jurisdiccionAutoFilled ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500' : ''}`}>
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
            disabled={createMutation.isPending || isSubmitting}
          >
            {createMutation.isPending || isSubmitting ? (
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
        </fieldset>
      </form>
    </div>
  );
}
