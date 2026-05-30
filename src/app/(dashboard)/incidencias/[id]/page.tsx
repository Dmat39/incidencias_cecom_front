'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useIncidencia, useUpdateAtencion, useUpdateIncidencia, useAssignSerenos, useUploadEvidencia, useEvidencias } from '@/hooks/useIncidencias';
import { useSerenosActivos } from '@/hooks/useSerenos';
import {
  useEstadoIncidencias, useEstadoProcesos, useGeneroAgresor,
  useGeneroVictima, useSeveridadProcesos, useSeveridades, useMedios, useOperadores,
  useUnidades, useTipoCasosByUnidad, useSubTipoCasosByTipo, useJurisdicciones,
  useTipoReportantes, useOperadoresByMedio,
} from '@/hooks/useCatalogos';
import EstadoBadge from '@/components/incidencias/EstadoBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Upload, UserCheck, X, FileText, Film, File, ZoomIn, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/date';
import type { UpdateAtencionDto, CreateIncidenciaDto } from '@/types';

const MapView = dynamic(() => import('@/components/mapa/MapView'), { ssr: false });
const MapPicker = dynamic(() => import('@/components/incidencias/MapPicker'), { ssr: false });

function DataRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 dark:text-gray-400 min-w-40 font-medium">{label}:</span>
      <span className="text-gray-800 dark:text-gray-100">{value || <span className="text-gray-400 dark:text-gray-500 italic">Sin datos</span>}</span>
    </div>
  );
}

export default function IncidenciaDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const incId = Number(id);

  const { data: inc, isLoading } = useIncidencia(incId);
  const { data: estados,           isLoading: loadingEstados }           = useEstadoIncidencias();
  const { data: estadosProceso,   isLoading: loadingEstadosProceso }   = useEstadoProcesos();
  const { data: generosAgresor,   isLoading: loadingGenerosAgresor }   = useGeneroAgresor();
  const { data: generosVictima,   isLoading: loadingGenerosVictima }   = useGeneroVictima();
  const { data: severidadProcesos, isLoading: loadingSeveridadProcesos } = useSeveridadProcesos();
  const { data: severidades,       isLoading: loadingSeveridades }       = useSeveridades();
  const { data: medios,            isLoading: loadingMedios }            = useMedios();
  const { data: operadores,        isLoading: loadingOperadores }        = useOperadores();
  const { data: serenos } = useSerenosActivos();

  // Catálogos para el tab General (edición)
  const { data: unidades } = useUnidades();
  const { data: jurisdicciones } = useJurisdicciones();
  const { data: tipoReportantes } = useTipoReportantes();

  const updateAtencion = useUpdateAtencion(incId);
  const updateInc = useUpdateIncidencia(incId);
  const assignSerenos = useAssignSerenos(incId);
  const uploadEvidencia = useUploadEvidencia(incId);
  const { data: evidencias = [] } = useEvidencias(incId);

  const [atencionForm, setAtencionForm] = useState<UpdateAtencionDto>({});
  const [serenoSearch, setSerenoSearch] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Estado para edición del tab General
  const [editingGeneral, setEditingGeneral] = useState(false);
  const [generalForm, setGeneralForm] = useState<Partial<CreateIncidenciaDto>>({});
  const [mapLoading, setMapLoading] = useState(false);

  // Catálogos en cascada para el formulario General
  const editUnidadId = generalForm.unidadId ?? inc?.unidadId;
  const editTipoCasoId = generalForm.tipoCasoId ?? inc?.tipoCasoId;
  const editMedioId = generalForm.medioId ?? inc?.medioId;
  const { data: tipoCasosFiltrados } = useTipoCasosByUnidad(editingGeneral ? editUnidadId : undefined);
  const { data: subTipoCasosFiltrados } = useSubTipoCasosByTipo(editingGeneral ? editTipoCasoId : undefined);
  const { data: operadoresFiltrados } = useOperadoresByMedio(editingGeneral ? editMedioId : undefined);

  function startEditGeneral() {
    setGeneralForm({
      unidadId: inc?.unidadId,
      tipoCasoId: inc?.tipoCasoId,
      subTipoCasoId: inc?.subTipoCasoId,
      severidadId: inc?.severidadId,
      jurisdiccionId: inc?.jurisdiccionId,
      medioId: inc?.medioId,
      operadorId: inc?.operadorId,
      tipoReportanteId: inc?.tipoReportanteId,
      nombreReportante: inc?.nombreReportante,
      telefonoReportante: inc?.telefonoReportante,
      direccion: inc?.direccion,
      latitud: inc?.latitud ? Number(inc.latitud) : undefined,
      longitud: inc?.longitud ? Number(inc.longitud) : undefined,
      descripcion: inc?.descripcion,
    });
    setEditingGeneral(true);
  }

  async function handleGeneralSubmit() {
    // Solo enviar los campos que realmente cambiaron respecto al valor original
    const originalValues: Partial<CreateIncidenciaDto> = {
      unidadId: inc?.unidadId,
      tipoCasoId: inc?.tipoCasoId,
      subTipoCasoId: inc?.subTipoCasoId,
      severidadId: inc?.severidadId,
      jurisdiccionId: inc?.jurisdiccionId,
      medioId: inc?.medioId,
      operadorId: inc?.operadorId,
      tipoReportanteId: inc?.tipoReportanteId,
      nombreReportante: inc?.nombreReportante ?? '',
      telefonoReportante: inc?.telefonoReportante ?? '',
      direccion: inc?.direccion ?? '',
      latitud: inc?.latitud ? Number(inc.latitud) : undefined,
      longitud: inc?.longitud ? Number(inc.longitud) : undefined,
      descripcion: inc?.descripcion ?? '',
    };

    const diff = (Object.keys(generalForm) as (keyof CreateIncidenciaDto)[]).reduce(
      (acc, key) => {
        const newVal = generalForm[key];
        const oldVal = originalValues[key];
        if (newVal !== oldVal) acc[key] = newVal as never;
        return acc;
      },
      {} as Partial<CreateIncidenciaDto>
    );

    if (Object.keys(diff).length === 0) {
      toast('Sin cambios para guardar', { icon: 'ℹ️' });
      setEditingGeneral(false);
      return;
    }

    try {
      await updateInc.mutateAsync(diff);
      toast.success('Incidencia actualizada');
      setEditingGeneral(false);
    } catch {
      toast.error('Error al guardar');
    }
  }

  const BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

  function getEvidenciaUrl(rutaArchivo?: string | null, nombreArchivo?: string | null): string | null {
    if (rutaArchivo) {
      // rutaArchivo es ruta absoluta del servidor → extraer solo el nombre del archivo almacenado
      const storedFilename = rutaArchivo.replace(/\\/g, '/').split('/').pop();
      return `${BASE_URL}/uploads/${storedFilename}`;
    }
    if (nombreArchivo) {
      // Copiado por srvi-backend → EXTERNAL_FILES_PATH/filename.ext
      return `${BASE_URL}/files/${nombreArchivo}`;
    }
    return null;
  }

  function isImage(nombre: string) { return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(nombre); }
  function isVideo(nombre: string) { return /\.(mp4|webm|ogg|avi|mov)$/i.test(nombre); }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!inc) {
    return <div className="text-center py-16 text-gray-400">Incidencia no encontrada</div>;
  }

  const assignedSerenoIds = (inc.serenos || []).map((s) => s.sereno.id);
  const filteredSerenos = serenos?.filter(
    (s) =>
      `${s.nombres} ${s.apellidoPaterno} ${s.dni}`.toLowerCase().includes(serenoSearch.toLowerCase())
  );

  async function handleAtencionSubmit() {
    try {
      await updateAtencion.mutateAsync(atencionForm);
      toast.success('Atención registrada');
    } catch {
      toast.error('Error al guardar');
    }
  }

  async function handleEstadoChange(situacionId: string) {
    try {
      await updateInc.mutateAsync({ situacionId: Number(situacionId) });
      toast.success('Estado actualizado');
    } catch {
      toast.error('Error al actualizar estado');
    }
  }

  async function handleToggleSereno(serenoId: number) {
    const ids = assignedSerenoIds.includes(serenoId)
      ? assignedSerenoIds.filter((id) => id !== serenoId)
      : [...assignedSerenoIds, serenoId];
    try {
      await assignSerenos.mutateAsync(ids);
      toast.success('Serenos actualizados');
    } catch {
      toast.error('Error al asignar sereno');
    }
  }

  async function handleUpload() {
    if (!fileInput) return;
    const fd = new FormData();
    fd.append('file', fileInput);
    try {
      await uploadEvidencia.mutateAsync(fd);
      toast.success('Archivo subido');
      setFileInput(null);
    } catch {
      toast.error('Error al subir archivo');
    }
  }

  const lat = inc.latitud ? Number(inc.latitud) : undefined;
  const lng = inc.longitud ? Number(inc.longitud) : undefined;

  return (
    <div className="max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 font-mono">{inc.codigoIncidencia || `#${inc.id}`}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(inc.registradoEn, "dd 'de' MMMM yyyy, HH:mm")}
          </p>
        </div>
        <EstadoBadge estado={inc.situacion?.descripcion} className="text-sm px-3 py-1" />
        <Select onValueChange={handleEstadoChange} value={String(inc.situacionId || '')}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="Cambiar estado" />
          </SelectTrigger>
          <SelectContent>
            {estados?.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>{e.descripcion}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="bg-gray-100 dark:bg-gray-800">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="atencion">Atención</TabsTrigger>
          {/* <TabsTrigger value="serenos">Serenos</TabsTrigger> */}
          <TabsTrigger value="evidencias">Evidencias</TabsTrigger>
          <TabsTrigger value="mapa">Mapa</TabsTrigger>
        </TabsList>

        {/* TAB: General */}
        <TabsContent value="general">
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardContent className="p-5 space-y-4">
              {/* Encabezado con botón editar/cancelar */}
              <div className="flex justify-end gap-2">
                {editingGeneral ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditingGeneral(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleGeneralSubmit} disabled={updateInc.isPending}>
                      <Save className="h-4 w-4 mr-1" /> Guardar
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={startEditGeneral}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                )}
              </div>

              {editingGeneral ? (
                /* MODO EDICIÓN */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-3">Clasificación</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Unidad</Label>
                    <Select
                      value={generalForm.unidadId ? String(generalForm.unidadId) : undefined}
                      onValueChange={(v) => setGeneralForm((f) => ({ ...f, unidadId: Number(v), tipoCasoId: undefined, subTipoCasoId: undefined }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {unidades?.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.descripcion || u.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Tipo de caso</Label>
                    <Select
                      value={generalForm.tipoCasoId ? String(generalForm.tipoCasoId) : undefined}
                      onValueChange={(v) => setGeneralForm((f) => ({ ...f, tipoCasoId: Number(v), subTipoCasoId: undefined }))}
                      disabled={!editUnidadId}
                    >
                      <SelectTrigger><SelectValue placeholder={!editUnidadId ? 'Seleccione unidad primero' : 'Seleccionar'} /></SelectTrigger>
                      <SelectContent>
                        {tipoCasosFiltrados?.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.codigo ? `${t.codigo} - ${t.descripcion}` : t.descripcion}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Subtipo</Label>
                    <Select
                      value={generalForm.subTipoCasoId ? String(generalForm.subTipoCasoId) : undefined}
                      onValueChange={(v) => setGeneralForm((f) => ({ ...f, subTipoCasoId: Number(v) }))}
                      disabled={!editTipoCasoId}
                    >
                      <SelectTrigger><SelectValue placeholder={!editTipoCasoId ? 'Seleccione tipo primero' : 'Seleccionar'} /></SelectTrigger>
                      <SelectContent>
                        {subTipoCasosFiltrados?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.codigo ? `${s.codigo} - ${s.descripcion}` : s.descripcion}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Severidad</Label>
                    <Select
                      value={generalForm.severidadId ? String(generalForm.severidadId) : undefined}
                      onValueChange={(v) => setGeneralForm((f) => ({ ...f, severidadId: Number(v) }))}
                      disabled={loadingSeveridades}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {severidades?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.descripcion}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Jurisdicción</Label>
                    <Select
                      value={generalForm.jurisdiccionId ? String(generalForm.jurisdiccionId) : undefined}
                      onValueChange={(v) => setGeneralForm((f) => ({ ...f, jurisdiccionId: Number(v) }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {jurisdicciones?.map((j) => <SelectItem key={j.id} value={String(j.id)}>{j.nombre || j.codigo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 border-t pt-3">
                    <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-3">Canal</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Medio</Label>
                    <Select
                      value={generalForm.medioId ? String(generalForm.medioId) : undefined}
                      onValueChange={(v) => setGeneralForm((f) => ({ ...f, medioId: Number(v), operadorId: undefined }))}
                      disabled={loadingMedios}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {medios?.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.descripcion}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Operador</Label>
                    <Select
                      value={generalForm.operadorId ? String(generalForm.operadorId) : undefined}
                      onValueChange={(v) => setGeneralForm((f) => ({ ...f, operadorId: Number(v) }))}
                      disabled={!editMedioId}
                    >
                      <SelectTrigger><SelectValue placeholder={!editMedioId ? 'Seleccione medio primero' : 'Seleccionar'} /></SelectTrigger>
                      <SelectContent>
                        {operadoresFiltrados?.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.descripcion}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 border-t pt-3">
                    <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-3">Reportante</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Tipo de reportante</Label>
                    <Select
                      value={generalForm.tipoReportanteId ? String(generalForm.tipoReportanteId) : undefined}
                      onValueChange={(v) => setGeneralForm((f) => ({ ...f, tipoReportanteId: Number(v) }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {tipoReportantes?.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.descripcion}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Nombre del reportante</Label>
                    <Input
                      value={generalForm.nombreReportante ?? ''}
                      onChange={(e) => setGeneralForm((f) => ({ ...f, nombreReportante: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Teléfono del reportante</Label>
                    <Input
                      value={generalForm.telefonoReportante ?? ''}
                      onChange={(e) => setGeneralForm((f) => ({ ...f, telefonoReportante: e.target.value }))}
                    />
                  </div>

                  <div className="md:col-span-2 border-t pt-3">
                    <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-3">Ubicación</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Dirección</Label>
                    <Input
                      value={generalForm.direccion ?? ''}
                      onChange={(e) => setGeneralForm((f) => ({ ...f, direccion: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Latitud</Label>
                    <Input
                      type="number"
                      step="any"
                      value={generalForm.latitud ?? ''}
                      onChange={(e) => setGeneralForm((f) => ({ ...f, latitud: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Longitud</Label>
                    <Input
                      type="number"
                      step="any"
                      value={generalForm.longitud ?? ''}
                      onChange={(e) => setGeneralForm((f) => ({ ...f, longitud: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="flex items-center gap-2">
                      Seleccionar en el mapa
                      {mapLoading && <span className="text-xs text-gray-400 font-normal">Obteniendo dirección...</span>}
                    </Label>
                    <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
                      <MapPicker
                        lat={generalForm.latitud ?? (inc?.latitud ? Number(inc.latitud) : undefined)}
                        lng={generalForm.longitud ?? (inc?.longitud ? Number(inc.longitud) : undefined)}
                        onSelect={(lat, lng, address) => {
                          setGeneralForm((f) => ({
                            ...f,
                            latitud: lat,
                            longitud: lng,
                            ...(address ? { direccion: address } : {}),
                          }));
                        }}
                        onLoading={setMapLoading}
                        activeJurisdiccionName={inc?.jurisdiccion?.nombre ?? undefined}
                      />
                    </div>
                    <p className="text-xs text-gray-400">Haz clic en el mapa para actualizar la ubicación y dirección automáticamente.</p>
                  </div>

                  <div className="md:col-span-2 border-t pt-3">
                    <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-3">Descripción</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Textarea
                      rows={3}
                      value={generalForm.descripcion ?? ''}
                      onChange={(e) => setGeneralForm((f) => ({ ...f, descripcion: e.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                /* MODO LECTURA */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  <div className="space-y-2">
                    <p className="text-xs text-green-700 dark:text-green-400 font-semibold uppercase tracking-wide mb-2">Clasificación</p>
                    <DataRow label="Unidad" value={inc.unidad?.descripcion} />
                    <DataRow label="Tipo de caso" value={inc.tipoCaso?.codigo ? `${inc.tipoCaso.codigo} - ${inc.tipoCaso.descripcion}` : inc.tipoCaso?.descripcion} />
                    <DataRow label="Subtipo" value={inc.subTipoCaso?.codigo ? `${inc.subTipoCaso.codigo} - ${inc.subTipoCaso.descripcion}${inc.subTipoCaso.urgencia ? ` (${inc.subTipoCaso.urgencia})` : ''}` : inc.subTipoCaso?.descripcion} />
                    <DataRow label="Severidad" value={inc.severidad?.descripcion} />
                    <DataRow label="Jurisdicción" value={inc.jurisdiccion?.nombre || inc.jurisdiccion?.codigo} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-green-700 dark:text-green-400 font-semibold uppercase tracking-wide mb-2">Canal</p>
                    <DataRow label="Medio" value={inc.medio?.descripcion} />
                    <DataRow label="Operador" value={inc.operador?.descripcion} />
                    <DataRow
                      label="Registrado por"
                      value={(inc as any).usuario
                        ? `${(inc as any).usuario.nombres ?? ''} ${(inc as any).usuario.apellidos ?? ''}`.trim() || (inc as any).usuario.username
                        : undefined}
                    />
                  </div>
                  <div className="space-y-2 mt-4">
                    <p className="text-xs text-green-700 dark:text-green-400 font-semibold uppercase tracking-wide mb-2">Reportante</p>
                    <DataRow label="Tipo" value={inc.tipoReportante?.descripcion} />
                    <DataRow label="Nombre" value={inc.nombreReportante} />
                    <DataRow label="Teléfono" value={inc.telefonoReportante} />
                  </div>
                  <div className="space-y-2 mt-4">
                    <p className="text-xs text-green-700 dark:text-green-400 font-semibold uppercase tracking-wide mb-2">Ubicación</p>
                    <DataRow label="Dirección" value={inc.direccion} />
                    <DataRow label="Latitud" value={lat ? String(lat) : undefined} />
                    <DataRow label="Longitud" value={lng ? String(lng) : undefined} />
                  </div>
                  <div className="md:col-span-2 mt-2 space-y-2">
                    <p className="text-xs text-green-700 dark:text-green-400 font-semibold uppercase tracking-wide mb-2">Descripción</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 border border-gray-100 dark:border-gray-700/50">
                      {inc.descripcion || <span className="text-gray-400 italic">Sin descripción</span>}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Atención */}
        <TabsContent value="atencion">
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <Label>Descripción de intervención</Label>
                  <Textarea
                    rows={3}
                    defaultValue={inc.descripcionIntervencion || ''}
                    onChange={(e) => setAtencionForm((f) => ({ ...f, descripcionIntervencion: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nombre del agraviado</Label>
                  <Input
                    defaultValue={inc.nombreAgraviado || ''}
                    onChange={(e) => setAtencionForm((f) => ({ ...f, nombreAgraviado: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Teléfono del agraviado</Label>
                  <Input
                    defaultValue={inc.telefonoAgraviado || ''}
                    onChange={(e) => setAtencionForm((f) => ({ ...f, telefonoAgraviado: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Estado del proceso</Label>
                  <Select
                    key={`ep-${estadosProceso?.length}`}
                    defaultValue={inc.estadoProcesoId ? String(inc.estadoProcesoId) : undefined}
                    onValueChange={(v) => setAtencionForm((f) => ({ ...f, estadoProcesoId: Number(v) }))}
                    disabled={loadingEstadosProceso}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingEstadosProceso ? 'Cargando...' : 'Seleccionar'} />
                    </SelectTrigger>
                    <SelectContent>
                      {estadosProceso?.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.descripcion}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Género agresor</Label>
                  <Select
                    key={`ga-${generosAgresor?.length}`}
                    defaultValue={inc.generoAgresorId ? String(inc.generoAgresorId) : undefined}
                    onValueChange={(v) => setAtencionForm((f) => ({ ...f, generoAgresorId: Number(v) }))}
                    disabled={loadingGenerosAgresor}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingGenerosAgresor ? 'Cargando...' : 'Seleccionar'} />
                    </SelectTrigger>
                    <SelectContent>
                      {generosAgresor?.map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.descripcion}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Género víctima</Label>
                  <Select
                    key={`gv-${generosVictima?.length}`}
                    defaultValue={inc.generoVictimaId ? String(inc.generoVictimaId) : undefined}
                    onValueChange={(v) => setAtencionForm((f) => ({ ...f, generoVictimaId: Number(v) }))}
                    disabled={loadingGenerosVictima}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingGenerosVictima ? 'Cargando...' : 'Seleccionar'} />
                    </SelectTrigger>
                    <SelectContent>
                      {generosVictima?.map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.descripcion}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Severidad del proceso</Label>
                  <Select
                    key={`sp-${severidadProcesos?.length}`}
                    defaultValue={inc.severidadProcesoId ? String(inc.severidadProcesoId) : undefined}
                    onValueChange={(v) => setAtencionForm((f) => ({ ...f, severidadProcesoId: Number(v) }))}
                    disabled={loadingSeveridadProcesos}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingSeveridadProcesos ? 'Cargando...' : 'Seleccionar'} />
                    </SelectTrigger>
                    <SelectContent>
                      {severidadProcesos?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.descripcion}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Severidad</Label>
                  <Select
                    key={`sv-${severidades?.length}`}
                    defaultValue={inc.severidadId ? String(inc.severidadId) : undefined}
                    onValueChange={(v) => setAtencionForm((f) => ({ ...f, severidadId: Number(v) }))}
                    disabled={loadingSeveridades}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingSeveridades ? 'Cargando...' : 'Seleccionar'} />
                    </SelectTrigger>
                    <SelectContent>
                      {severidades?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.descripcion}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Situación</Label>
                  <Select
                    key={`sit-${estados?.length}`}
                    defaultValue={inc.situacionId ? String(inc.situacionId) : undefined}
                    onValueChange={(v) => setAtencionForm((f) => ({ ...f, situacionId: Number(v) }))}
                    disabled={loadingEstados}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingEstados ? 'Cargando...' : 'Seleccionar'} />
                    </SelectTrigger>
                    <SelectContent>
                      {estados?.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.descripcion}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Medio</Label>
                  <Select
                    key={`med-${medios?.length}`}
                    defaultValue={inc.medioId ? String(inc.medioId) : undefined}
                    onValueChange={(v) => setAtencionForm((f) => ({ ...f, medioId: Number(v) }))}
                    disabled={loadingMedios}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingMedios ? 'Cargando...' : 'Seleccionar'} />
                    </SelectTrigger>
                    <SelectContent>
                      {medios?.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.descripcion}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Operador</Label>
                  <Select
                    key={`op-${operadores?.length}`}
                    defaultValue={inc.operadorId ? String(inc.operadorId) : undefined}
                    onValueChange={(v) => setAtencionForm((f) => ({ ...f, operadorId: Number(v) }))}
                    disabled={loadingOperadores}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingOperadores ? 'Cargando...' : 'Seleccionar'} />
                    </SelectTrigger>
                    <SelectContent>
                      {operadores?.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.descripcion}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Fecha/Hora de atención</Label>
                  <Input
                    type="datetime-local"
                    defaultValue={inc.atendidoEn ? inc.atendidoEn.slice(0, 16) : ''}
                    onChange={(e) => setAtencionForm((f) => ({ ...f, atendidoEn: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={handleAtencionSubmit} className="bg-green-600 hover:bg-green-700" disabled={updateAtencion.isPending}>
                <Save className="h-4 w-4 mr-2" /> Guardar Atención
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Serenos — oculto temporalmente, el reportante sereno se registra en Datos del Reportante */}

        {/* TAB: Evidencias */}
        <TabsContent value="evidencias">
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardContent className="p-5 space-y-4">
              {/* Upload */}
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={(e) => setFileInput(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                <Button onClick={handleUpload} disabled={!fileInput || uploadEvidencia.isPending} className="bg-green-600 hover:bg-green-700">
                  <Upload className="h-4 w-4 mr-1" /> Subir
                </Button>
              </div>

              {/* Galería */}
              {evidencias.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No hay evidencias adjuntas</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {evidencias.map((ev) => {
                    const url = getEvidenciaUrl(ev.rutaArchivo, ev.nombreArchivo);
                    const nombre = ev.nombreArchivo || ev.rutaArchivo?.replace(/\\/g, '/').split('/').pop() || '';
                    const imagen = isImage(nombre);
                    const video  = isVideo(nombre);

                    return (
                      <div key={ev.id} className="group relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800/50 flex flex-col">
                        {/* Previsualización */}
                        {imagen && url ? (
                          <button
                            className="relative w-full aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center"
                            onClick={() => setLightbox(url)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={ev.nombreArchivo || 'evidencia'}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                            </span>
                          </button>
                        ) : video && url ? (
                          <div className="w-full aspect-square bg-gray-900 flex items-center justify-center">
                            <video src={url} className="w-full h-full object-contain" controls />
                          </div>
                        ) : (
                          <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
                            {nombre.endsWith('.pdf')
                              ? <FileText className="h-10 w-10 text-red-400" />
                              : <File className="h-10 w-10 text-gray-400" />}
                          </div>
                        )}

                        {/* Info + descarga */}
                        <div className="p-2 flex flex-col gap-0.5">
                          <p className="text-xs text-gray-700 dark:text-gray-300 truncate font-medium" title={nombre || ''}>
                            {nombre || 'archivo'}
                          </p>
                          {ev.fechaHoraRegistro && (
                            <p className="text-xs text-gray-400">{formatDate(ev.fechaHoraRegistro, 'dd/MM/yy HH:mm')}</p>
                          )}
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={ev.nombreArchivo || true}
                              className="text-xs text-green-600 hover:underline mt-0.5"
                            >
                              Descargar
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lightbox */}
          {lightbox && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setLightbox(null)}
            >
              <button
                className="absolute top-4 right-4 text-white hover:text-gray-300"
                onClick={() => setLightbox(null)}
              >
                <X className="h-8 w-8" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox}
                alt="evidencia"
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </TabsContent>

        {/* TAB: Mapa */}
        <TabsContent value="mapa">
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardContent className="p-0 h-96 rounded-lg overflow-hidden">
              {lat && lng ? (
                <MapView
                  incidencias={[inc]}
                  center={[lat, lng]}
                  zoom={16}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  Sin coordenadas registradas
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
