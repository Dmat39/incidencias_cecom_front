'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  usePanicoAlertas,
  useCambiarEstadoAlerta,
  useBloquearUsuarioPanico,
  useVecinosApp,
  type PanicoAlerta,
  type EstadoApp,
  type FiltroEstadoAlerta,
} from '@/hooks/usePanicoAlertas';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/lib/socket';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import {
  Smartphone, MapPin, User, Calendar,
  ChevronLeft, ChevronRight, X, ExternalLink, AlertTriangle,
  ShieldAlert, CheckCircle, XCircle, Loader2, Lock, FilePlus, FileCheck,
  Copy, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

const AlertaMapView = dynamic(
  () => import('@/components/alertas/AlertaMapView'),
  { ssr: false, loading: () => <div className="w-full h-72 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" /> },
);

function PhoneDisplay({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(phone).then(() => {
      setCopied(true);
      toast.success('Número copiado');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-green-600 dark:text-green-400 font-semibold">{phone}</span>
      <button
        onClick={handleCopy}
        title="Copiar número"
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}

function todayLima() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
}

function formatFecha(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' });
}

function EstadoBadge({ descripcion }: { descripcion?: string | null }) {
  if (!descripcion) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Pendiente</span>;
  }
  const d = descripcion.toLowerCase();
  const cls = d.includes('atendid') ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    : d.includes('aten') ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    : d.includes('cerr') ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{descripcion}</span>;
}

function PanicoBadge({ estado }: { estado: string | null }) {
  if (!estado) return null;
  const map: Record<string, { label: string; dot: string; cls: string }> = {
    RECIBIDA:   {
      label: 'Pendiente',
      dot:   'bg-red-500',
      cls:   'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/25',
    },
    ATENDIENDO: {
      label: 'En atención',
      dot:   'bg-amber-500',
      cls:   'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25',
    },
    FINALIZADA: {
      label: 'Atendida',
      dot:   'bg-emerald-500',
      cls:   'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25',
    },
    FALSA:      {
      label: 'Falsa alarma',
      dot:   'bg-slate-400',
      cls:   'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-500/25',
    },
  };
  const item = map[estado] ?? { label: estado, dot: 'bg-gray-400', cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${item.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.dot}`} />
      {item.label}
    </span>
  );
}

// ── Modal de bloqueo ──────────────────────────────────────────────────────────

interface BloqueoModalProps {
  dni: string;
  nombre: string;
  onConfirm: (motivo: string, tipo: 'BLOQUEADO' | 'SUSPENDIDO') => void;
  onClose: () => void;
  cargando: boolean;
}

function BloqueoModal({ dni, nombre, onConfirm, onClose, cargando }: BloqueoModalProps) {
  const [motivo, setMotivo] = useState('');
  const [tipo, setTipo] = useState<'BLOQUEADO' | 'SUSPENDIDO'>('BLOQUEADO');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-red-600" />
            <span className="font-bold text-gray-800 dark:text-gray-100">Bloquear usuario</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>{nombre}</strong> · DNI {dni}
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de bloqueo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'BLOQUEADO' | 'SUSPENDIDO')}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="BLOQUEADO">Bloqueado (permanente)</option>
              <option value="SUSPENDIDO">Suspendido (temporal)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo <span className="text-red-500">*</span></label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Explica el motivo del bloqueo (mín. 5 caracteres)..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={motivo.trim().length < 5 || cargando}
              onClick={() => onConfirm(motivo.trim(), tipo)}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
            >
              {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Confirmar bloqueo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Panel de detalle ──────────────────────────────────────────────────────────

interface DetallePanelProps {
  alerta: PanicoAlerta;
  onClose: () => void;
}

function DetallePanel({ alerta, onClose }: DetallePanelProps) {
  const router        = useRouter();
  const currentUser   = useAuthStore((s) => s.user);
  const panicAlertId  = alerta.id;
  const dni           = alerta.dniReportante;
  const nombre        = alerta.nombreReportante ?? '—';

  const [estadoPanico, setEstadoPanico]     = useState<string | null>(alerta.estadoApp ?? null);
  const estadoInicialRef = useRef<string | null>(alerta.estadoApp ?? null);

  // Cámaras cercanas desde SIVECAM
  const [camaras, setCamaras] = useState<any[]>([]);
  const [camarasCargando, setCamarasCargando] = useState(false);

  useEffect(() => {
    if (!alerta.latitud || !alerta.longitud) return;
    setCamarasCargando(true);
    fetch(
      `${process.env.NEXT_PUBLIC_SIVECAM_API_URL}/api/camaras/cercanas?lat=${alerta.latitud}&lng=${alerta.longitud}&radio=500`,
    )
      .then((r) => r.json())
      .then((data) => setCamaras(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch(() => setCamaras([]))
      .finally(() => setCamarasCargando(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerta.id]);

  // Radios GPS cercanas desde SIVECAM — con polling para actualizar posiciones
  const [radios, setRadios] = useState<any[]>([]);
  const [radiosCargando, setRadiosCargando] = useState(false);

  useEffect(() => {
    if (!alerta.latitud || !alerta.longitud) return;

    const url = `${process.env.NEXT_PUBLIC_SIVECAM_API_URL}/api/radios/cercanas?lat=${alerta.latitud}&lng=${alerta.longitud}&radio=500`;

    const fetchRadios = (inicial = false) => {
      if (inicial) setRadiosCargando(true);
      fetch(url)
        .then((r) => r.json())
        .then((data) => setRadios(Array.isArray(data) ? data : (data?.data ?? [])))
        .catch(() => {})
        .finally(() => { if (inicial) setRadiosCargando(false); });
    };

    fetchRadios(true);
    const interval = setInterval(() => fetchRadios(false), 15_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerta.id]);

  // Sync local estado when parent updates (e.g. otro operador tomó la alerta via WebSocket)
  useEffect(() => {
    setEstadoPanico(alerta.estadoApp ?? null);
  }, [alerta.estadoApp]);

  const cambiar = useCambiarEstadoAlerta();
  const [sugerencia, setSugerencia]           = useState<{ mensaje: string } | null>(null);
  const [mostrarBloqueo, setMostrarBloqueo]   = useState(false);
  const [mostrarConfirmCrear, setMostrarConfirmCrear] = useState(false);
  const [creando, setCreando]                 = useState(false);

  function irACrearIncidencia() {
    const p = new URLSearchParams();
    if (alerta.nombreReportante)   p.set('nombre',    alerta.nombreReportante);
    if (alerta.telefonoReportante) p.set('telefono',  alerta.telefonoReportante);
    if (alerta.dniReportante)      p.set('dni',       alerta.dniReportante);
    if (alerta.latitud)            p.set('lat',       String(alerta.latitud));
    if (alerta.longitud)           p.set('lng',       String(alerta.longitud));
    if (alerta.direccion)          p.set('direccion', alerta.direccion);
    if (alerta.registradoEn) {
      const dt = new Date(alerta.registradoEn)
        .toLocaleString('sv-SE', { timeZone: 'America/Lima' })
        .replace(' ', 'T')
        .substring(0, 16);
      p.set('ocurridoEn', dt);
    }
    p.set('medioId',          '3');  // APP Vecino Seguro SJL
    p.set('tipoReportanteId', '1');  // Vecino / ciudadano
    p.set('origen',           'panico');
    p.set('panicAlertId',     String(panicAlertId));
    router.push(`/incidencias/nueva?${p.toString()}`);
  }

  async function confirmarCrearIncidencia() {
    setCreando(true);
    try {
      await cambiar.mutateAsync({ panicAlertId, estado: 'FINALIZADA', operadorRef: currentUser?.username });
      setEstadoPanico('FINALIZADA');
    } catch {
      // Si falla el cambio de estado igual navegamos, no bloqueamos el flujo
    }
    setMostrarConfirmCrear(false);
    setCreando(false);
    irACrearIncidencia();
  }

  const bloquear = useBloquearUsuarioPanico();

  const mapsUrl  = alerta.latitud && alerta.longitud
    ? `https://www.google.com/maps?q=${alerta.latitud},${alerta.longitud}`
    : null;
  const tieneGps = !!(alerta.latitud && alerta.longitud);

  async function accion(estado: 'ATENDIENDO' | 'FINALIZADA' | 'FALSA') {
    try {
      const res = await cambiar.mutateAsync({ panicAlertId, estado, operadorRef: currentUser?.username });
      setEstadoPanico(res.alerta?.estado ?? estado);
      if (res.sugerenciaBloqueo) {
        setSugerencia(res.sugerenciaBloqueo);
        toast(`⚠️ ${res.sugerenciaBloqueo.mensaje}`, { duration: 8000, icon: '⚠️' });
      }
      toast.success(`Estado → ${estado}`);
    } catch (e: any) {
      const raw = e?.response?.data?.message;
      const msg = typeof raw === 'string' ? raw : (e?.message ?? 'Error al cambiar estado');
      toast.error(msg);
    }
  }

  // Auto-ATENDIENDO al abrir el panel (si no está ya en estado terminal)
  useEffect(() => {
    if (estadoPanico === 'FINALIZADA' || estadoPanico === 'FALSA' || estadoPanico === 'ATENDIENDO') return;
    cambiar.mutate(
      { panicAlertId, estado: 'ATENDIENDO', operadorRef: currentUser?.username },
      {
        onSuccess: (res) => setEstadoPanico(res.alerta?.estado ?? 'ATENDIENDO'),
        onError: () => {},
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Cierra el panel: libera el lock y revierte el estado si el auto-ATENDIENDO fue quien lo cambió */
  function handleClose() {
    const eraTerminal = estadoInicialRef.current === 'FINALIZADA' || estadoInicialRef.current === 'FALSA';

    if (!eraTerminal) {
      getSocket().emit('panico:leave', { alertId: panicAlertId });

      const eraRecibida = estadoInicialRef.current === 'RECIBIDA' || estadoInicialRef.current === null;
      if (eraRecibida && (estadoPanico === 'ATENDIENDO' || cambiar.isPending)) {
        cambiar.mutate(
          { panicAlertId, estado: 'RECIBIDA', operadorRef: currentUser?.username },
          { onError: () => {} },
        );
      }
    }

    onClose();
  }

  async function confirmarBloqueo(motivo: string, tipo: 'BLOQUEADO' | 'SUSPENDIDO') {
    if (!dni) { toast.error('DNI no disponible'); return; }
    try {
      await bloquear.mutateAsync({ dni, motivo, tipo, operadorRef: currentUser?.username ?? 'cecom-operador' });
      toast.success(`Usuario bloqueado (${tipo})`);
      setMostrarBloqueo(false);
    } catch (e: any) {
      const raw = e?.response?.data?.message;
      const msg = typeof raw === 'string' ? raw : (e?.message ?? 'Error al bloquear usuario');
      toast.error(msg);
    }
  }

  const esTerminal   = estadoPanico === 'FINALIZADA' || estadoPanico === 'FALSA';
  const puedeAtender = !esTerminal && (!estadoPanico || estadoPanico === 'RECIBIDA');
  const puedeFinalizar = !esTerminal;
  const puedeFalsa     = !esTerminal;
  const incidenciaCecom = alerta.incidenciaCecom;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[94vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="font-bold text-gray-800 dark:text-gray-100">Alerta #{alerta.id}</span>
              <PanicoBadge estado={estadoPanico} />
            </div>
            <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Alerta tomada por otro operador */}
            {estadoPanico === 'ATENDIENDO' && alerta.operadorRef && alerta.operadorRef !== currentUser?.username && (
              <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-3 py-2.5">
                <ShieldAlert className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  En atención por <strong>{alerta.operadorRef}</strong>
                </p>
              </div>
            )}

            {/* Sugerencia de bloqueo */}
            {sugerencia && (
              <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-3 py-2.5">
                <ShieldAlert className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-700 dark:text-orange-400">{sugerencia.mensaje}</p>
              </div>
            )}

            {/* Datos del vecino */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="font-semibold text-gray-800 dark:text-gray-100">{nombre}</span>
                {dni && <span className="text-xs text-gray-400">DNI {dni}</span>}
              </div>
              {alerta.telefonoReportante && (
                <div className="flex items-center gap-2 text-sm">
                  <PhoneDisplay phone={alerta.telefonoReportante} />
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">{formatFecha(alerta.registradoEn)}</span>
              </div>
              {alerta.jurisdiccion && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">Jurisdicción: <strong>{alerta.jurisdiccion.nombre}</strong></span>
                </div>
              )}
            </div>

            {/* Dirección */}
            {alerta.direccion && (
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2">
                <span className="font-medium">Ubicación:</span> {alerta.direccion}
              </p>
            )}

            {/* Mapa con cámaras y radios cercanas */}
            {tieneGps && (
              <div className="space-y-1">
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 h-72">
                  <AlertaMapView
                    lat={alerta.latitud!}
                    lng={alerta.longitud!}
                    camaras={camaras}
                    radios={radios}
                  />
                </div>
                {/* Leyenda */}
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 px-1">
                  <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
                    Alerta
                  </span>
                  {camarasCargando
                    ? <span className="text-[10px] text-gray-400 animate-pulse">Buscando cámaras...</span>
                    : camaras.length > 0 && (
                      <>
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                          <span className="inline-block w-3 h-3 rounded bg-blue-500" />
                          Municipal ({camaras.filter(c => c.tipo === 'municipal').length})
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                          <span className="inline-block w-3 h-3 rounded bg-purple-500" />
                          Vecinal ({camaras.filter(c => c.tipo === 'vecinal').length})
                        </span>
                      </>
                    )
                  }
                  {radiosCargando
                    ? <span className="text-[10px] text-gray-400 animate-pulse">Buscando radios...</span>
                    : radios.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                        <span className="inline-block w-3 h-3 rounded bg-green-500" />
                        Radios ({radios.length})
                      </span>
                    )
                  }
                </div>
              </div>
            )}

            {/* Botones de acción del estado */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Gestión de alerta</p>
              <div className="flex flex-wrap gap-2">
                {puedeAtender && (
                  <button
                    disabled={cambiar.isPending}
                    onClick={() => accion('ATENDIENDO')}
                    className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                  >
                    {cambiar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                    Atendiendo
                  </button>
                )}
                {puedeFinalizar && (
                  <button
                    disabled={cambiar.isPending}
                    onClick={() => accion('FINALIZADA')}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                  >
                    {cambiar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Finalizar
                  </button>
                )}
                {puedeFalsa && (
                  <button
                    disabled={cambiar.isPending}
                    onClick={() => accion('FALSA')}
                    className="flex items-center gap-1.5 bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                  >
                    {cambiar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    Falsa alarma
                  </button>
                )}
                {dni && (
                  <button
                    onClick={() => setMostrarBloqueo(true)}
                    className="flex items-center gap-1.5 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Bloquear usuario
                  </button>
                )}
              </div>
            </div>

            {/* Incidencia registrada (banner) */}
            {incidenciaCecom && (
              <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400">Incidencia CECOM registrada</p>
                  <p className="text-xs text-green-600 dark:text-green-500">{incidenciaCecom.codigoIncidencia}</p>
                </div>
              </div>
            )}

            {/* Botones principales: Crear incidencia | Ver en Google Maps */}
            <div className="flex gap-3">
              {!incidenciaCecom && (
                <button
                  onClick={() => setMostrarConfirmCrear(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                >
                  <FilePlus className="h-4 w-4" />
                  Crear incidencia
                </button>
              )}
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold text-sm py-2.5 rounded-xl transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver en Google Maps
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {mostrarBloqueo && dni && (
        <BloqueoModal
          dni={dni}
          nombre={nombre}
          cargando={bloquear.isPending}
          onConfirm={confirmarBloqueo}
          onClose={() => setMostrarBloqueo(false)}
        />
      )}

      {mostrarConfirmCrear && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <FilePlus className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-gray-800 dark:text-gray-100">Crear incidencia</span>
              </div>
              <button
                onClick={() => setMostrarConfirmCrear(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Al continuar, la alerta <strong>#{panicAlertId}</strong> se marcará automáticamente como <strong className="text-green-600 dark:text-green-400">Atendida</strong> y serás redirigido al formulario de incidencia.
              </p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                ¿Deseas continuar?
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setMostrarConfirmCrear(false)}
                  disabled={creando}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarCrearIncidencia}
                  disabled={creando}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                >
                  {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus className="h-4 w-4" />}
                  Sí, crear incidencia
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

const FILTROS_ESTADO: { value: FiltroEstadoAlerta; label: string }[] = [
  { value: 'TODOS',      label: 'Todas' },
  { value: 'PENDIENTE',  label: 'Pendiente' },
  { value: 'ATENDIENDO', label: 'En atención' },
  { value: 'ATENDIDA',   label: 'Atendida' },
  { value: 'FALSA',      label: 'Falsa alarma' },
];

export default function AlertasSjlPage() {
  const qc          = useQueryClient();
  const user        = useAuthStore((s) => s.user);
  const [page, setPage]         = useState(1);
  const [fecha, setFecha]       = useState('');
  const [estado, setEstado]     = useState<FiltroEstadoAlerta>('TODOS');
  const [seleccionada, setSeleccionada] = useState<PanicoAlerta | null>(null);

  const { data, isLoading }   = usePanicoAlertas(page, fecha || undefined, estado);
  // Carga vecinos para mostrar candado en usuarios bloqueados/suspendidos
  const { data: vecinos = [] } = useVecinosApp();

  // Map DNI → estado para lookup O(1)
  const vecinoEstadoMap = new Map(vecinos.map((v) => [v.dni, v.estado]));

  // Cuando la query refetcha (tras invalidateQueries), actualizar seleccionada
  useEffect(() => {
    if (!seleccionada || !data?.data) return;
    const actualizada = data.data.find((a) => a.id === seleccionada.id);
    if (actualizada) setSeleccionada(actualizada);
  }, [data?.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const esSupervisorOAdmin = user?.roles?.some((r) => r === 'admin' || r === 'supervisor') ?? false;

  useSocket({
    'alerta-panico-actualizada': (payload: { panicAlertId: number; estado: string; operadorNombre: string }) => {
      qc.setQueriesData<{ data: PanicoAlerta[]; total: number; page: number; limit: number; totalPages: number }>(
        { queryKey: ['panico', 'alertas'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((a) => {
              if (a.id !== payload.panicAlertId) return a;
              // Solo actualizar operadorRef si viene con valor; si el estado es terminal limpiar
              const esTerminal = payload.estado === 'FINALIZADA' || payload.estado === 'FALSA';
              return {
                ...a,
                estadoApp: payload.estado as EstadoApp,
                operadorRef: esTerminal ? null : (payload.operadorNombre || a.operadorRef),
              };
            }),
          };
        }
      );
    },
    'alerta-panico-liberada': (payload: { alertId: number }) => {
      // Solo limpiar operadorRef si la alerta NO sigue en ATENDIENDO
      qc.setQueriesData<{ data: PanicoAlerta[]; total: number; page: number; limit: number; totalPages: number }>(
        { queryKey: ['panico', 'alertas'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((a) =>
              a.id === payload.alertId && a.estadoApp !== 'ATENDIENDO'
                ? { ...a, operadorRef: null }
                : a
            ),
          };
        }
      );
    },
  });

  /** Abre el panel; admin/supervisor entran sin lock; operadores son bloqueados si ya está tomada */
  function handleAlertaClick(alerta: PanicoAlerta) {
    const esTerminal = alerta.estadoApp === 'FINALIZADA' || alerta.estadoApp === 'FALSA';

    // Terminales y supervisores/admin entran directo sin lock
    if (esTerminal || esSupervisorOAdmin) {
      setSeleccionada(alerta);
      return;
    }

    // Si ya está siendo atendida por otro operador, bloquear
    if (
      alerta.estadoApp === 'ATENDIENDO' &&
      alerta.operadorRef &&
      alerta.operadorRef !== user?.username
    ) {
      toast.error(`Esta alerta ya está siendo atendida por ${alerta.operadorRef}`, { duration: 5000 });
      return;
    }

    getSocket().emit(
      'panico:join',
      { alertId: alerta.id, operadorNombre: user?.username ?? 'Operador' },
      (res: { ok: boolean; tomadaPor?: string }) => {
        if (!res?.ok) {
          toast.error(`Esta alerta ya está siendo atendida por ${res?.tomadaPor ?? 'otro operador'}`, { duration: 5000 });
          return;
        }
        setSeleccionada(alerta);
      },
    );
  }

  function cambiarEstadoFiltro(nuevo: FiltroEstadoAlerta) {
    setEstado(nuevo);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-red-600" />
            Alertas SJL — Botón de Pánico
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Alertas generadas desde la App Vecino Seguro SJL
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Fecha</label>
          <input
            type="date"
            value={fecha}
            max={todayLima()}
            onChange={(e) => { setFecha(e.target.value); setPage(1); }}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          {fecha && (
            <button
              onClick={() => { setFecha(''); setPage(1); }}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Filtros por estado */}
      <div className="flex flex-wrap gap-2">
        {FILTROS_ESTADO.map((f) => (
          <button
            key={f.value}
            onClick={() => cambiarEstadoFiltro(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              estado === f.value
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
            {estado === f.value && data?.total != null && (
              <span className="ml-1.5 opacity-80">({data.total})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">N°</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fecha / Hora</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Vecino</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Jurisdicción</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading
                ? [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : (data?.data ?? []).length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-600">
                      <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay alertas{fecha ? ' para esta fecha' : ''}{estado !== 'TODOS' ? ` con estado "${FILTROS_ESTADO.find(f => f.value === estado)?.label}"` : ''}</p>
                    </td>
                  </tr>
                )
                : (data?.data ?? []).map((alerta, index) => {
                  const estadoVecino   = alerta.dniReportante ? vecinoEstadoMap.get(alerta.dniReportante) : undefined;
                  const estaBloqueado  = estadoVecino === 'BLOQUEADO' || estadoVecino === 'SUSPENDIDO';
                  const posicion = (page - 1) * (data?.limit ?? 10) + index + 1;

                  return (
                    <tr
                      key={alerta.id}
                      onClick={() => handleAlertaClick(alerta)}
                      className={`cursor-pointer transition-colors ${
                        estaBloqueado
                          ? 'bg-red-50/40 dark:bg-red-900/10 hover:bg-red-100/60 dark:hover:bg-red-900/20'
                          : 'hover:bg-red-50 dark:hover:bg-red-900/10'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{posicion}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatFecha(alerta.registradoEn)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {estaBloqueado && (
                            <span title={estadoVecino === 'BLOQUEADO' ? 'Usuario bloqueado' : 'Usuario suspendido'}>
                              <Lock className={`h-3.5 w-3.5 flex-shrink-0 ${estadoVecino === 'BLOQUEADO' ? 'text-red-500' : 'text-orange-500'}`} />
                            </span>
                          )}
                          <span className="font-medium text-gray-800 dark:text-gray-100">
                            {alerta.nombreReportante ?? '—'}
                          </span>
                          {estaBloqueado && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              estadoVecino === 'BLOQUEADO'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                            }`}>
                              {estadoVecino === 'BLOQUEADO' ? 'BLOQUEADO' : 'SUSPENDIDO'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {alerta.telefonoReportante
                          ? <PhoneDisplay phone={alerta.telefonoReportante} />
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{alerta.jurisdiccion?.nombre ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="inline-flex flex-col items-start gap-1">
                          <PanicoBadge estado={alerta.estadoApp} />
                          {alerta.estadoApp === 'ATENDIENDO' && alerta.operadorRef && (
                            <span className="flex items-center gap-1 pl-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium max-w-[130px] truncate">
                              <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                              {alerta.operadorRef}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {alerta.latitud && alerta.longitud
                          ? (
                            <a
                              href={`https://www.google.com/maps?q=${alerta.latitud},${alerta.longitud}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              Ver GPS
                            </a>
                          )
                          : <span className="text-gray-400 text-xs">—</span>
                        }
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {(data?.totalPages ?? 0) > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {data?.total} alertas · Página {data?.page} de {data?.totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data?.totalPages ?? 1, p + 1))}
                disabled={page === (data?.totalPages ?? 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {seleccionada && (
        <DetallePanel alerta={seleccionada} onClose={() => setSeleccionada(null)} />
      )}
    </div>
  );
}
