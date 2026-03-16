'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, MapPin } from 'lucide-react';
import apiSvi from '@/lib/apiSvi';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// ─── tipos simples ────────────────────────────────────────────────────────────
interface Option { id: number; nombre?: string; descripcion?: string; label?: string; }

interface Sereno {
  id: number;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  cargo_sereno_id?: number;
}

interface Incidencia {
  id: number;
  jurisdiccion_id?: number;
  direccion?: string;
  descripcion?: string;
  tipo_caso_id?: number;
  sub_tipo_caso_id?: number;
  tipo_reportante_id?: number;
  nombre_reportante?: string;
  telefono_reportante?: string;
  celular_reportante?: string;
  sereno_id?: number;
  cargo_sereno_id?: number;
  medio_id?: number;
  situacion_id?: number;
  operador_id?: number;
  estado_proceso_id?: number;
  genero_agresor_id?: number;
  genero_victima_id?: number;
  severidad_id?: number;
  severidad_proceso_id?: number;
  doneAt?: string;
  createdAt?: string;
  [key: string]: any;
}

interface Props {
  open: boolean;
  incidencia: Incidencia | null;
  onClose: () => void;
  onSuccess: (id: number) => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function optLabel(o: Option) { return o.descripcion ?? o.nombre ?? o.label ?? String(o.id); }

async function fetchOption(path: string): Promise<Option[]> {
  try {
    const res = await apiSvi.get(path);
    return res.data?.data ?? res.data ?? [];
  } catch { return []; }
}

// ─── MapPicker (Leaflet lazy) ─────────────────────────────────────────────────
function MapPicker({
  lat, lng, onChange,
}: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const marker = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    let isActive = true;

    import('leaflet').then((L) => {
      if (!isActive || !mapRef.current) return;

      // Si ya está inicializado por Leaflet, eliminar el id para permitir re-init
      if ((mapRef.current as any)._leaflet_id) {
        mapObj.current?.remove();
        mapObj.current = null;
        marker.current = null;
        delete (mapRef.current as any)._leaflet_id;
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      const map = L.map(mapRef.current).setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);
      marker.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.current.on('dragend', () => {
        const { lat: la, lng: lo } = marker.current.getLatLng();
        onChange(la, lo);
      });
      map.on('click', (e: any) => {
        marker.current.setLatLng(e.latlng);
        onChange(e.latlng.lat, e.latlng.lng);
      });
      mapObj.current = map;
    });

    return () => {
      isActive = false;
      mapObj.current?.remove();
      mapObj.current = null;
      marker.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!marker.current || !mapObj.current) return;
    marker.current.setLatLng([lat, lng]);
    mapObj.current.setView([lat, lng], mapObj.current.getZoom());
  }, [lat, lng]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} style={{ height: 220, width: '100%', borderRadius: 8, zIndex: 0 }} />
    </>
  );
}

// ─── Sección visual ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 border-b pb-1">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label: lbl, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-gray-600">{lbl}</Label>
      {children}
    </div>
  );
}

function SelectField({
  value, onChange, options, placeholder = 'Seleccionar...', disabled = false,
}: {
  value: string; onChange: (v: string) => void; options: Option[]; placeholder?: string; disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white w-full disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-default"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={String(o.id)}>{optLabel(o)}</option>
      ))}
    </select>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────
export default function SviUpdIncidencias({ open, incidencia, onClose, onSuccess }: Props) {
  // ── catálogos ──────────────────────────────────────────────────────────────
  const [loadingCats, setLoadingCats] = useState(false);
  const [tipoCasos,      setTipoCasos]      = useState<Option[]>([]);
  const [allSubtipos,    setAllSubtipos]    = useState<Option[]>([]);
  const [subtipos,       setSubtipos]       = useState<Option[]>([]);
  const [jurisdicciones, setJurisdicciones] = useState<Option[]>([]);
  const [estadosProceso, setEstadosProceso] = useState<Option[]>([]);
  const [generosAgresor, setGenerosAgresor] = useState<Option[]>([]);
  const [generosVictima, setGenerosVictima] = useState<Option[]>([]);
  const [severidadesPro, setSeveridadesPro] = useState<Option[]>([]);
  const [severidades,    setSeveridades]    = useState<Option[]>([]);
  const [medios,         setMedios]         = useState<Option[]>([]);
  const [situaciones,    setSituaciones]    = useState<Option[]>([]);
  const [operadores,     setOperadores]     = useState<Option[]>([]);
  const [serenos,        setSerenos]        = useState<Sereno[]>([]);
  const [cargos,         setCargos]         = useState<Option[]>([]);

  // ── form fields ────────────────────────────────────────────────────────────
  const [tipoCasoId,        setTipoCasoId]        = useState('');
  const [subtipoId,         setSubtipoId]          = useState('');
  const [tipoReportanteId,  setTipoReportanteId]  = useState('');
  const [nombreReportante,  setNombreReportante]  = useState('');
  const [telefonoReportante, setTelefonoReportante] = useState('');
  const [serenoId,          setSerenoId]           = useState('');
  const [cargoId,           setCargoId]            = useState('');
  const [medioReportanteId, setMedioReportanteId] = useState('');
  const [operadorMedioId,   setOperadorMedioId]   = useState('');
  const [jurisdiccionId,    setJurisdiccionId]     = useState('');
  const [direccion,         setDireccion]          = useState('');
  const [lat,               setLat]               = useState(-11.9961);
  const [lng,               setLng]               = useState(-77.0282);
  const [descripcion,       setDescripcion]        = useState('');
  const [fechaOcurrencia,   setFechaOcurrencia]   = useState('');
  const [horaOcurrencia,    setHoraOcurrencia]    = useState('');
  const [estadoProcesoId,   setEstadoProcesoId]   = useState('');
  const [generoAgresorId,   setGeneroAgresorId]   = useState('');
  const [generoVictimaId,   setGeneroVictimaId]   = useState('');
  const [severidadProId,    setSeveridadProId]     = useState('');
  const [severidadId,       setSeveridadId]        = useState('');
  const [medioId,           setMedioId]            = useState('');
  const [situacionId,       setSituacionId]        = useState('');
  const [operadorId,        setOperadorId]         = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Ref para saber si el usuario cambió tipo_caso manualmente (y así resetear subtipo)
  // vs carga inicial (no resetear)
  const userChangedTipoCaso = useRef(false);

  // ── subtipos filtrados por tipo_caso ──────────────────────────────────────
  useEffect(() => {
    if (!tipoCasoId) { setSubtipos(allSubtipos); return; }
    const filtered = allSubtipos.filter((s: any) => String(s.tipo_caso_id) === tipoCasoId);
    setSubtipos(filtered.length > 0 ? filtered : allSubtipos);
    // Solo resetear subtipo cuando el usuario lo cambia explícitamente
    if (userChangedTipoCaso.current) {
      setSubtipoId('');
      userChangedTipoCaso.current = false;
    }
  }, [tipoCasoId, allSubtipos]);

  // ── pre-poblar form desde incidencia al abrir ──────────────────────────────
  useEffect(() => {
    if (!open || !incidencia) return;
    setTipoCasoId(String(incidencia.tipo_caso_id ?? ''));
    setSubtipoId(String(incidencia.sub_tipo_caso_id ?? ''));
    setTipoReportanteId(String(incidencia.tipo_reportante_id ?? ''));
    setNombreReportante(incidencia.nombre_reportante ?? '');
    setTelefonoReportante(incidencia.telefono_reportante ?? incidencia.celular_reportante ?? '');
    setSerenoId(String(incidencia.sereno_id ?? ''));
    setCargoId(String(incidencia.cargo_sereno_id ?? ''));
    setJurisdiccionId(String(incidencia.jurisdiccion_id ?? ''));
    setDireccion(incidencia.direccion ?? '');
    setDescripcion(incidencia.descripcion ?? '');
    setMedioId(String(incidencia.medio_id ?? ''));
    setSituacionId(String(incidencia.situacion_id ?? ''));
    setOperadorId(String(incidencia.operador_id ?? ''));
    setEstadoProcesoId(String(incidencia.estado_proceso_id ?? ''));
    setGeneroAgresorId(String(incidencia.genero_agresor_id ?? ''));
    setGeneroVictimaId(String(incidencia.genero_victima_id ?? ''));
    setSeveridadId(String(incidencia.severidad_id ?? ''));
    setSeveridadProId(String(incidencia.severidad_proceso_id ?? ''));
    if (incidencia.latitud)  setLat(Number(incidencia.latitud));
    if (incidencia.longitud) setLng(Number(incidencia.longitud));
    // fecha y hora desde doneAt o createdAt, convertidas a hora Lima (UTC-5)
    const raw = incidencia.doneAt ?? incidencia.createdAt;
    if (raw) {
      const d = dayjs.utc(raw).tz('America/Lima');
      setFechaOcurrencia(d.format('YYYY-MM-DD'));
      setHoraOcurrencia(d.format('HH:mm'));
    }
    loadCatalogos(incidencia);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, incidencia]);

  // ── cargar catálogos y aplicar defaults (igual que SVI) ───────────────────
  async function loadCatalogos(inc: Incidencia) {
    setLoadingCats(true);
    try {
      const [
        tcRes, stRes, jurRes, epRes,
        gaRes, gvRes, spRes, svRes,
        mdRes, siRes, opRes, srRes, cgRes,
      ] = await Promise.all([
        fetchOption('/tipificaciones/tipo_casos/'),
        fetchOption('/tipificaciones/subtipo_casos/'),
        fetchOption('/serenos/jurisdicciones'),
        fetchOption('/informacion/estados_proceso/'),
        fetchOption('/informacion/genero_agresor/'),
        fetchOption('/informacion/genero_victima/'),
        fetchOption('/informacion/severidad_procesos/'),
        fetchOption('/informacion/severidades/'),
        fetchOption('/procesos/medios/'),
        fetchOption('/procesos/situaciones/'),
        fetchOption('/procesos/operadores/'),
        apiSvi.get('/serenos/').then((r) => r.data?.data ?? r.data ?? []).catch(() => []),
        fetchOption('/serenos/cargos/'),
      ]);

      setTipoCasos(tcRes);
      setAllSubtipos(stRes);
      setSubtipos(stRes);
      setJurisdicciones(jurRes);
      setEstadosProceso(epRes);
      setGenerosAgresor(gaRes);
      setGenerosVictima(gvRes);
      setSeveridadesPro(spRes);
      setSeveridades(svRes);
      setMedios(mdRes);
      setSituaciones(siRes);
      setOperadores(opRes);
      setSerenos(srRes);
      setCargos(cgRes);

      // Aplicar defaults igual que SVI (situaciones[1], agresor[2], victima[2], procesos[4], estados[3], severidad[3])
      setEstadoProcesoId((prev) => prev || String(epRes[3]?.id ?? ''));
      setGeneroAgresorId((prev) => prev || String(gaRes[2]?.id ?? ''));
      setGeneroVictimaId((prev) => prev || String(gvRes[2]?.id ?? ''));
      setSeveridadProId((prev)  => prev || String(spRes[4]?.id ?? ''));
      setSituacionId((prev)     => prev || String(siRes[1]?.id ?? ''));
      setSeveridadId((prev)     => prev || String(svRes[3]?.id ?? ''));
    } finally {
      setLoadingCats(false);
    }
  }

  // ── submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!incidencia) return;
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        jurisdiccion_id:      jurisdiccionId    ? Number(jurisdiccionId)    : undefined,
        tipo_caso_id:         tipoCasoId        ? Number(tipoCasoId)        : undefined,
        sub_tipo_caso_id:     subtipoId         ? Number(subtipoId)         : undefined,
        tipo_reportante_id:   tipoReportanteId  ? Number(tipoReportanteId)  : undefined,
        direccion:            direccion || undefined,
        descripcion:          descripcion || undefined,
        fecha_ocurrencia:     fechaOcurrencia || undefined,
        hora_ocurrencia:      horaOcurrencia ? (horaOcurrencia.length === 5 ? `${horaOcurrencia}:00` : horaOcurrencia) : undefined,
        estado_proceso_id:    estadoProcesoId   ? Number(estadoProcesoId)   : undefined,
        genero_agresor_id:    generoAgresorId   ? Number(generoAgresorId)   : undefined,
        genero_victima_id:    generoVictimaId   ? Number(generoVictimaId)   : undefined,
        severidad_proceso_id: severidadProId    ? Number(severidadProId)    : undefined,
        severidad_id:         severidadId       ? Number(severidadId)       : undefined,
        medio_id:             medioId           ? Number(medioId)           : undefined,
        situacion_id:         situacionId       ? Number(situacionId)       : undefined,
        operador_id:          operadorId        ? Number(operadorId)        : undefined,
        latitud:  incidencia.latitud  != null ? String(lat)  : undefined,
        longitud: incidencia.longitud != null ? String(lng)  : undefined,
      };

      const tRep = Number(tipoReportanteId);
      if (tRep === 1) {
        payload.nombre_reportante    = nombreReportante || undefined;
        payload.telefono_reportante  = telefonoReportante || undefined;
      } else if (tRep === 2) {
        payload.sereno_id           = serenoId  ? Number(serenoId)  : undefined;
        payload.cargo_sereno_id     = cargoId   ? Number(cargoId)   : undefined;
        payload.telefono_reportante = telefonoReportante || undefined;
      } else if (tRep === 4) {
        payload.medio_id    = medioReportanteId ? Number(medioReportanteId) : undefined;
        payload.operador_id = operadorMedioId   ? Number(operadorMedioId)   : undefined;
      }

      // Remove undefined keys
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      await apiSvi.patch(`/incidencias/${incidencia.id}`, payload);
      toast.success('Incidencia procesada correctamente');
      onSuccess(incidencia.id);
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === 'string' ? err.response.data : null);
      console.error('Error PATCH /incidencias:', err?.response?.status, err?.response?.data);
      toast.error(serverMsg ? `Error: ${serverMsg}` : 'Error al procesar la incidencia');
    } finally {
      setSubmitting(false);
    }
  }

  const tipoRep = Number(tipoReportanteId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-slate-700">
            Continuar Proceso — Pre-incidencia #{incidencia?.id}
          </DialogTitle>
        </DialogHeader>

        {loadingCats ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
            <p className="text-sm text-gray-500">Cargando formulario...</p>
          </div>
        ) : (
          <div className="space-y-4 pb-2">

            {/* ── Tipificación ─────────────────────────────────────────────── */}
            <Section title="Tipificación de incidencia">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo de Caso">
                  <SelectField
                    value={tipoCasoId}
                    onChange={(v) => { userChangedTipoCaso.current = true; setTipoCasoId(v); }}
                    options={tipoCasos}
                  />
                </Field>
                <Field label="Subtipo de Caso">
                  <SelectField
                    value={subtipoId}
                    onChange={setSubtipoId}
                    options={subtipos}
                  />
                </Field>
              </div>
            </Section>

            {/* ── Datos del reportante ──────────────────────────────────────── */}
            <Section title="Datos del reportante">
              <Field label="Tipo de reportante">
                <SelectField
                  value={tipoReportanteId}
                  onChange={setTipoReportanteId}
                  options={[
                    { id: 1, nombre: 'Ciudadano' },
                    { id: 2, nombre: 'Sereno' },
                    { id: 4, nombre: 'Medio de comunicación' },
                  ]}
                />
              </Field>

              {/* tipo = 1 → Ciudadano */}
              {tipoRep === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Teléfono del Reportante">
                    <Input
                      value={telefonoReportante}
                      onChange={(e) => setTelefonoReportante(e.target.value)}
                      placeholder="Número de teléfono"
                      disabled
                    />
                  </Field>
                  <Field label="Nombre del Reportante">
                    <Input
                      value={nombreReportante}
                      onChange={(e) => setNombreReportante(e.target.value)}
                      placeholder="Nombre completo"
                      disabled
                    />
                  </Field>
                </div>
              )}

              {/* tipo = 2 → Sereno */}
              {tipoRep === 2 && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Cargo del Sereno">
                    <SelectField
                      value={cargoId}
                      onChange={setCargoId}
                      options={cargos}
                      disabled
                    />
                  </Field>
                  <Field label="Teléfono del Reportante">
                    <Input
                      value={telefonoReportante}
                      onChange={(e) => setTelefonoReportante(e.target.value)}
                      placeholder="Número de teléfono"
                      disabled
                    />
                  </Field>
                  <Field label="ID del Sereno">
                    <SelectField
                      value={serenoId}
                      onChange={setSerenoId}
                      options={serenos.map((s) => ({
                        id: s.id,
                        nombre: `${s.nombres} ${s.apellidoPaterno} ${s.apellidoMaterno ?? ''}`.trim(),
                      }))}
                      disabled
                    />
                  </Field>
                </div>
              )}

              {/* tipo = 4 → Cámara / Medio */}
              {tipoRep === 4 && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Medio">
                    <SelectField
                      value={medioReportanteId}
                      onChange={setMedioReportanteId}
                      options={medios}
                    />
                  </Field>
                  <Field label="ID del Operador">
                    <SelectField
                      value={operadorMedioId}
                      onChange={setOperadorMedioId}
                      options={operadores}
                    />
                  </Field>
                </div>
              )}
            </Section>

            {/* ── Ubicación ─────────────────────────────────────────────────── */}
            <Section title="Ubicación de incidencia">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dirección">
                  <Input
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Dirección de la incidencia"
                  />
                </Field>
                <Field label="Jurisdicción">
                  <SelectField
                    value={jurisdiccionId}
                    onChange={setJurisdiccionId}
                    options={jurisdicciones}
                    disabled
                  />
                </Field>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <span className="text-xs text-gray-600">
                    Haz clic en el mapa o arrastra el marcador para ajustar la ubicación
                  </span>
                </div>
                <MapPicker lat={lat} lng={lng} onChange={(la, lo) => { setLat(la); setLng(lo); }} />
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <span>Lat: {lat.toFixed(6)}</span>
                  <span>Lng: {lng.toFixed(6)}</span>
                </div>
              </div>
            </Section>

            {/* ── Detalle ───────────────────────────────────────────────────── */}
            <Section title="Detalle de incidencia">
              <Field label="Descripción">
                <Textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción detallada de la incidencia..."
                  rows={3}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha de Ocurrencia">
                  <Input
                    type="date"
                    value={fechaOcurrencia}
                    onChange={(e) => setFechaOcurrencia(e.target.value)}
                  />
                </Field>
                <Field label="Hora de Ocurrencia">
                  <Input
                    type="time"
                    value={horaOcurrencia}
                    onChange={(e) => setHoraOcurrencia(e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Estado del Proceso">
                  <SelectField
                    value={estadoProcesoId}
                    onChange={setEstadoProcesoId}
                    options={estadosProceso}
                  />
                </Field>
                <Field label="Severidad del Proceso">
                  <SelectField
                    value={severidadProId}
                    onChange={setSeveridadProId}
                    options={severidadesPro}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Género del Agresor">
                  <SelectField
                    value={generoAgresorId}
                    onChange={setGeneroAgresorId}
                    options={generosAgresor}
                  />
                </Field>
                <Field label="Género de la Víctima">
                  <SelectField
                    value={generoVictimaId}
                    onChange={setGeneroVictimaId}
                    options={generosVictima}
                  />
                </Field>
                <Field label="Severidad">
                  <SelectField
                    value={severidadId}
                    onChange={setSeveridadId}
                    options={severidades}
                  />
                </Field>
              </div>
            </Section>

            {/* ── Propiedades ───────────────────────────────────────────────── */}
            <Section title="Propiedades de incidencia">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Medio">
                  <SelectField value={medioId} onChange={setMedioId} options={medios} />
                </Field>
                <Field label="Situación">
                  <SelectField value={situacionId} onChange={setSituacionId} options={situaciones} />
                </Field>
                <Field label="ID del Operador">
                  <SelectField value={operadorId} onChange={setOperadorId} options={operadores} />
                </Field>
              </div>
            </Section>

            {/* ── Acciones ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 gap-2"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {submitting ? 'Guardando...' : 'Guardar y continuar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
