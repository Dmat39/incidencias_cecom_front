'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateIncidencia } from '@/hooks/useIncidencias';
import {
  useUnidades, useTipoCasosByUnidad, useSubTipoCasosByTipo,
  useMedios, useOperadoresByMedio, useTipoReportantes,
  useSeveridades, useJurisdicciones, useEstadoIncidencias,
} from '@/hooks/useCatalogos';
import type { CatalogoItem } from '@/hooks/useCatalogos';
import type { CreateIncidenciaDto } from '@/types';

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
  const [severidadAutoFilled, setSeveridadAutoFilled] = useState(false);
  const [geocodingLoading,    setGeocodingLoading]    = useState(false);

  const { data: unidades }                                        = useUnidades();
  const { data: tiposCasoFiltrados, isLoading: loadingTipos }    = useTipoCasosByUnidad(selectedUnidad);
  const { data: subTiposFiltrados,  isLoading: loadingSubtipos } = useSubTipoCasosByTipo(selectedTipoCaso);
  const { data: medios }                                          = useMedios();
  const { data: operadoresFiltrados, isLoading: loadingOperadores } = useOperadoresByMedio(selectedMedio);
  const { data: tipoReportantes }    = useTipoReportantes();
  const { data: severidades }        = useSeveridades();
  const { data: jurisdicciones }     = useJurisdicciones();
  const { data: estados }            = useEstadoIncidencias();

  const { control, register, handleSubmit, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const lat = watch('latitud');
  const lng = watch('longitud');

  async function onSubmit(values: FormData) {
    try {
      // Eliminar strings vacíos y NaN para no enviar campos inválidos al backend
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) =>
          v !== undefined && v !== null && v !== '' && !Number.isNaN(v as number)
        )
      ) as CreateIncidenciaDto;
      const inc = await createMutation.mutateAsync(payload);
      toast.success(`Incidencia ${inc.codigoIncidencia} registrada`);
      router.push('/incidencias');
    } catch {
      toast.error('Error al registrar la incidencia');
    }
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
          <div className="p-5 grid grid-cols-2 gap-4">
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

            <Field label="Tipo de Caso">
              <Controller name="tipoCasoId" control={control} render={({ field }) => (
                <Select
                  key={`tipo-${selectedUnidad}`}
                  value={field.value ? String(field.value) : undefined}
                  disabled={!selectedUnidad || loadingTipos}
                  onValueChange={(v) => {
                    const n = Number(v); field.onChange(n);
                    setSelectedTipoCaso(n);
                    setValue('subTipoCasoId', undefined);
                  }}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={
                      !selectedUnidad ? 'Primero elige unidad'
                      : loadingTipos ? 'Cargando...'
                      : 'Seleccionar...'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposCasoFiltrados?.map((t: CatalogoItem) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.codigo ? `${t.codigo} - ${t.descripcion}` : t.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </Field>

            <Field label="Subtipo">
              <Controller name="subTipoCasoId" control={control} render={({ field }) => (
                <Select
                  key={`subtipo-${selectedTipoCaso}`}
                  value={field.value ? String(field.value) : undefined}
                  disabled={!selectedTipoCaso || loadingSubtipos}
                  onValueChange={(v) => {
                    const n = Number(v);
                    field.onChange(n);
                    // Auto-completar severidad según urgencia del subtipo
                    // urgencia en DB: ALTO/MEDIO/BAJO/CRITICO — severidades: ALTA/MEDIA/BAJA/CRÍTICA
                    // Usamos coincidencia por prefijo (ALT, MED, BAJ, CRIT)
                    const subtipo = subTiposFiltrados?.find((s: CatalogoItem) => s.id === n);
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
                      if (match) {
                        setValue('severidadId', match.id);
                        setSeveridadAutoFilled(true);
                      } else {
                        setSeveridadAutoFilled(false);
                      }
                    } else {
                      setSeveridadAutoFilled(false);
                    }
                  }}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={
                      !selectedTipoCaso ? 'Primero elige tipo'
                      : loadingSubtipos ? 'Cargando...'
                      : 'Seleccionar...'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {subTiposFiltrados?.map((s: CatalogoItem) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.codigo ? `${s.codigo} - ${s.descripcion}${s.urgencia ? ` (${s.urgencia})` : ''}` : s.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </Field>

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
                <Select onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {tipoReportantes?.map((t: CatalogoItem) => <SelectItem key={t.id} value={String(t.id)}>{t.descripcion}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </Field>

            <Field label="Nombre del Reportante">
              <Input placeholder="Nombre completo" className="h-9 text-sm" {...register('nombreReportante')} />
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
              <div className="rounded border border-gray-200 overflow-hidden" style={{ height: 280 }}>
                <MapPicker
                  lat={lat}
                  lng={lng}
                  onSelect={(l, lo, address) => {
                    setValue('latitud', l);
                    setValue('longitud', lo);
                    if (address) setValue('direccion', address);
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
              <Input type="datetime-local" className="h-9 text-sm" {...register('ocurridoEn')} />
            </Field>
          </div>
        </div>

        {/* Clasificación Final */}
        <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
          <SectionTitle title="Clasificación Final" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Jurisdicción">
              <Controller name="jurisdiccionId" control={control} render={({ field }) => (
                <Select onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
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
