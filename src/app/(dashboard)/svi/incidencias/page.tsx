'use client';

import { useEffect, useRef, useState } from 'react';
import { type Socket } from 'socket.io-client';
import { useSviAuthStore } from '@/store/sviAuthStore';
import apiSvi from '@/lib/apiSvi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, RefreshCw, Search, MonitorPlay, ArrowRight } from 'lucide-react';
import SviMediaSwiper from '@/components/svi/SviMediaSwiper';
import SviUpdIncidencias from '@/components/svi/SviUpdIncidencias';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const SVI_SOCKET_URL = process.env.NEXT_PUBLIC_SVI_SOCKET_URL || 'http://localhost:3008';

// Singleton para evitar reconexiones dobles en React StrictMode
let _socket: Socket | null = null;
function getSviIncidenciasSocket(): Socket {
  if (!_socket || _socket.disconnected) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { io } = require('socket.io-client') as typeof import('socket.io-client');
    _socket = io(SVI_SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
  }
  return _socket!;
}

const SECTORES = [
  'Zarate', 'Caja De Agua', 'La Huayrona', 'Canto Rey',
  'Santa Elizabeth', 'Bayovar', '10 De Octubre', 'Mariscal Caceres',
];

interface Incidencia {
  id: number;
  jurisdiccion?: string;
  jurisdiccion_id?: number;
  direccion?: string;
  creado?: string;
  hora?: string;
  descripcion?: string;
  motivo?: string;
  urgencia?: string | null;
  fotos?: any[];
  observacion?: string;
  [key: string]: any;
}

interface Subsector { id: number; nombre: string; }
interface Subtipo { id: number; descripcion: string; }

function obtenerUrgencia(descripcion: string): string | null {
  const parts = descripcion.split(/\s+/);
  const last = parts[parts.length - 1];
  if (last.startsWith('(') && last.endsWith(')')) {
    const inner = last.slice(1, -1);
    if (inner === 'Urgente' || inner === 'Medio') return inner;
  }
  return null;
}

function formatData(data: any[], subsectores: Subsector[], subtipos: Subtipo[]) {
  return data.map((inc) => {
    const fecha = dayjs.utc(inc.createdAt).tz('America/Lima');
    const subtipo = subtipos.find((s) => s.id === inc.sub_tipo_caso_id);
    return {
      ...inc,
      creado: fecha.format('DD/MM/YYYY'),
      hora: fecha.format('HH:mm'),
      jurisdiccion: subsectores.find((s) => s.id === inc.jurisdiccion_id)?.nombre ?? '—',
      urgencia: subtipo ? obtenerUrgencia(subtipo.descripcion) : null,
    };
  });
}

export default function SviIncidenciasPage() {
  const { token, userId } = useSviAuthStore();
  const [loading, setLoading]     = useState(false);
  const [lista, setLista]         = useState<Incidencia[]>([]);
  const [count, setCount]         = useState(0);
  const [search, setSearch]       = useState('');
  const [filtroJur, setFiltroJur] = useState<number[]>([]);
  const [subsectores, setSubsectores] = useState<Subsector[]>([]);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [selected,     setSelected]     = useState<Incidencia | null>(null);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [updOpen,      setUpdOpen]      = useState(false);

  const socketRef       = useRef<Socket | null>(null);
  const socketIdRef     = useRef<string | null>(null);
  const listaRef        = useRef<Incidencia[]>([]);
  const subsectoresRef  = useRef<Subsector[]>([]);
  const subtiposRef     = useRef<Subtipo[]>([]);
  const [reload, setReload] = useState(false);

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSviIncidenciasSocket();
    socketRef.current = socket;

    // Agregar listeners (se limpian al desmontar para no duplicarlos)
    const onSaludo         = (data: any)          => { socketIdRef.current = data.socketId; };
    const onAgregar        = (pre: any)            => {
      const [f] = formatData([pre], subsectoresRef.current, subtiposRef.current);
      setCount((c) => c + 1);
      listaRef.current = [...listaRef.current, f];
      setLista([...listaRef.current]);
    };
    const onEliminada      = ({ id }: { id: number }) => {
      setCount((c) => c - 1);
      listaRef.current = listaRef.current.filter((i) => i.id !== id);
      setLista([...listaRef.current]);
    };
    const onSeleccionada   = ({ id }: { id: number }) => {
      setCount((c) => c - 1);
      listaRef.current = listaRef.current.filter((i) => i.id !== id);
      setLista([...listaRef.current]);
    };
    const onCancelada      = (inc: any)            => {
      const [f] = formatData([inc], subsectoresRef.current, subtiposRef.current);
      setCount((c) => c + 1);
      const sorted = [...listaRef.current, f].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      listaRef.current = sorted;
      setLista(sorted);
    };

    socket.on('saludo',                  onSaludo);
    socket.on('agregar-preincidencia',   onAgregar);
    socket.on('preincidencia-eliminada', onEliminada);
    socket.on('preincidencia-seleccionada', onSeleccionada);
    socket.on('preincidencia-cancelada', onCancelada);

    // Limpieza: solo quitar los listeners, NO desconectar (singleton)
    return () => {
      socket.off('saludo',                  onSaludo);
      socket.off('agregar-preincidencia',   onAgregar);
      socket.off('preincidencia-eliminada', onEliminada);
      socket.off('preincidencia-seleccionada', onSeleccionada);
      socket.off('preincidencia-cancelada', onCancelada);
    };
  }, []);

  // Cancelar incidencia al recargar/cerrar ventana
  useEffect(() => {
    const handler = () => {
      if (selected && socketRef.current) {
        socketRef.current.emit('cancelar-preincidencia', { id: selected.id, user_id: userId });
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [selected, userId]);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll(window.location.search || '');
  }, [reload]);

  async function fetchAll(queryParams: string) {
    setLoading(true);
    try {
      const [incRes, jurRes, subRes] = await Promise.all([
        apiSvi.get(`/incidencias/${queryParams}`),
        apiSvi.get('/serenos/jurisdicciones'),
        apiSvi.get('/tipificaciones/subtipo_casos/'),
      ]);

      const subs: Subsector[] = (jurRes.data?.data ?? [])
        .map((j: any) => ({ id: j.id, nombre: j.nombre }))
        .filter((j: Subsector) => SECTORES.some((s) => j.nombre.toLowerCase().includes(s.toLowerCase())));

      const subtipos: Subtipo[] = subRes.data?.data ?? [];

      subsectoresRef.current = subs;
      subtiposRef.current    = subtipos;
      setSubsectores(subs);

      if (incRes.data) {
        setCount(incRes.data.totalCount ?? 0);
        const formatted = formatData(incRes.data.data ?? [], subs, subtipos);
        listaRef.current = formatted;
        setLista(formatted);
      }
    } catch {
      toast.error('Error al cargar incidencias SVI');
    } finally {
      setLoading(false);
    }
  }

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtrada = lista.filter((inc) => {
    const matchJur = filtroJur.length === 0 || filtroJur.includes(inc.jurisdiccion_id ?? 0);
    const q = search.toLowerCase();
    const matchSearch = !q || [inc.jurisdiccion, inc.descripcion, inc.motivo, inc.direccion, inc.hora]
      .some((v) => (v ?? '').toLowerCase().includes(q));
    return matchJur && matchSearch;
  });

  // ── Seleccionar incidencia (abre modal + emite socket) ──────────────────────
  function handleSelect(inc: Incidencia) {
    socketRef.current?.emit('select-preincidencia', { id: inc.id, user_id: userId }, (res: any) => {
      if (res?.status !== 'ok') {
        toast.error('No se pudo seleccionar la incidencia');
        setSelected(null);
        return;
      }
    });
    setSelected(inc);
    setModalOpen(true);
  }

  function cerrarModal() {
    if (selected) {
      socketRef.current?.emit('cancelar-preincidencia', { id: selected.id, user_id: userId });
    }
    setModalOpen(false);
    setSelected(null);
  }

  function handleEliminar(id: number) {
    if (!confirm('¿Seguro que quieres eliminar esta pre-incidencia?')) return;
    if (modalOpen) cerrarModal();
    socketRef.current?.emit('eliminar-preincidencia', { id, user_id: userId }, (res: any) => {
      if (res?.status === 'ok') toast.success('Pre-incidencia eliminada');
      else toast.error('Error al eliminar');
    });
  }

  // ── Excel export ────────────────────────────────────────────────────────────
  function exportExcel() {
    const rows = filtrada.map((item, i) => ({
      '#': i + 1,
      ID: item.id,
      Jurisdicción: item.jurisdiccion,
      Dirección: item.direccion ?? '',
      Fecha: item.creado,
      Hora: item.hora,
      Descripción: item.descripcion ?? '',
      Urgencia: item.urgencia ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Incidencias');
    XLSX.writeFile(wb, `Incidencias_SVI_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.xlsx`);
  }

  // ── Urgencia badge ──────────────────────────────────────────────────────────
  const urgenciaBadge = (u: string | null) => {
    if (!u) return null;
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${u === 'Urgente' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
        {u}
      </span>
    );
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-2">
        <MonitorPlay className="h-5 w-5 text-slate-600" />
        <h1 className="text-xl font-semibold text-gray-800">
          Pre-incidencias en vivo — SVI
          <span className="ml-2 text-sm text-gray-400 font-normal">({count} total)</span>
        </h1>
      </div>

      {/* Barra de herramientas */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro jurisdicciones */}
          <select
            className="border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            onChange={(e) => {
              const id = Number(e.target.value);
              setFiltroJur(id ? [id] : []);
            }}
          >
            <option value="">Todas las jurisdicciones</option>
            {subsectores.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>

          <Button variant="outline" size="sm" onClick={() => setReload((r) => !r)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={filtrada.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Exportar Excel
          </Button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-8 w-52 h-8"
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-auto flex-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-700 hover:bg-slate-700">
              <TableHead className="text-white font-semibold">#</TableHead>
              <TableHead className="text-white font-semibold">Jurisdicción</TableHead>
              <TableHead className="text-white font-semibold">Dirección</TableHead>
              <TableHead className="text-white font-semibold">Fecha</TableHead>
              <TableHead className="text-white font-semibold">Hora</TableHead>
              <TableHead className="text-white font-semibold text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {[1,2,3,4,5,6,7].map((j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : filtrada.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                  Sin pre-incidencias activas
                </TableCell>
              </TableRow>
            ) : (
              filtrada.map((inc, index) => (
                <TableRow key={inc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleSelect(inc)}>
                  <TableCell className="font-medium text-sm text-slate-700">{index + 1}</TableCell>
                  <TableCell className="text-sm">{inc.jurisdiccion}</TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">{inc.direccion}</TableCell>
                  <TableCell className="text-sm text-gray-500">{inc.creado}</TableCell>
                  <TableCell className="text-sm text-gray-500">{inc.hora}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-slate-600 hover:bg-slate-50"
                      onClick={(e) => { e.stopPropagation(); handleSelect(inc); }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal detalle */}
      <Dialog open={modalOpen} onOpenChange={() => cerrarModal()}>
        <DialogContent className="max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Detalle de Pre-incidencia #{selected?.id}
            </DialogTitle>
          </DialogHeader>

          {selected && Object.keys(selected).length > 0 ? (
            <div className="space-y-4">
              {/* Imágenes / Videos */}
              {selected.fotos && selected.fotos.length > 0 && (
                <SviMediaSwiper images={selected.fotos} />
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-semibold text-gray-600">Jurisdicción:</span> <span>{selected.jurisdiccion}</span></div>
                <div><span className="font-semibold text-gray-600">Dirección:</span> <span>{selected.direccion}</span></div>
                <div><span className="font-semibold text-gray-600">Fecha:</span> <span>{selected.creado}</span></div>
                <div><span className="font-semibold text-gray-600">Hora:</span> <span>{selected.hora}</span></div>
                {selected.urgencia && (
                  <div><span className="font-semibold text-gray-600">Urgencia:</span> {urgenciaBadge(selected.urgencia)}</div>
                )}
              </div>

              <div>
                <p className="font-semibold text-gray-700 mb-1">Descripción</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{selected.descripcion}</p>
              </div>

              {selected.observacion && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Observación</p>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{selected.observacion}</p>
                </div>
              )}

              <div className="flex justify-center pt-2 border-t">
                <Button
                  className="bg-slate-600 hover:bg-slate-700"
                  onClick={() => setConfirmOpen(true)}
                >
                  Continuar Proceso
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-red-500 text-sm">Esta pre-incidencia ya no está disponible. Recarga la página.</p>
          )}
        </DialogContent>
      </Dialog>
      {/* Modal confirmación */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Continuar con el proceso?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mt-1">
            Se abrirá el formulario para registrar la incidencia #{selected?.id}.
            ¿Deseas continuar?
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button
              className="bg-slate-700 hover:bg-slate-800"
              onClick={() => {
                setConfirmOpen(false);
                setModalOpen(false);
                setUpdOpen(true);
              }}
            >
              Sí, continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Continuar Proceso (UpdIncidencias) */}
      <SviUpdIncidencias
        open={updOpen}
        incidencia={selected}
        onClose={() => {
          // cancelar — devolver al estado como pendiente
          if (selected && socketRef.current) {
            socketRef.current.emit('cancelar-preincidencia', { id: selected.id, user_id: userId });
          }
          setUpdOpen(false);
          setSelected(null);
        }}
        onSuccess={(id) => {
          setUpdOpen(false);
          setSelected(null);
          // el socket 'preincidencia-seleccionada' la retira de la lista automáticamente
          listaRef.current = listaRef.current.filter((i) => i.id !== id);
          setLista([...listaRef.current]);
          setCount((c) => Math.max(0, c - 1));
        }}
      />
    </div>
  );
}
