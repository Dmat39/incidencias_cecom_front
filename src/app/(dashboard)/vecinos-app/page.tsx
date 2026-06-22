'use client';

import { useState } from 'react';
import {
  useVecinosApp,
  useBloqueoHistorial,
  useDesbloquearUsuario,
  useBloquearUsuarioPanico,
  type VecinoApp,
  type BloqueHistorial,
} from '@/hooks/usePanicoAlertas';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, Lock, ShieldCheck, AlertTriangle,
  X, Loader2, RotateCcw, History,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFecha(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function EstadoBadge({ estado }: { estado: VecinoApp['estado'] }) {
  const map = {
    ACTIVO:     { label: 'Activo',     cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    BLOQUEADO:  { label: 'Bloqueado',  cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    SUSPENDIDO: { label: 'Suspendido', cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
  };
  const { label, cls } = map[estado] ?? { label: estado, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

// ── Modal historial de bloqueos ───────────────────────────────────────────────

interface HistorialModalProps {
  vecino: VecinoApp;
  onClose: () => void;
  onDesbloquear: () => void;
  desbloqueando: boolean;
}

function HistorialBloqueos({ usuarioId }: { usuarioId: number }) {
  const { data, isLoading } = useBloqueoHistorial(usuarioId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">Sin historial de bloqueos</p>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {data.map((b: BloqueHistorial) => (
        <div
          key={b.id}
          className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5 text-xs"
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`font-semibold ${b.tipo === 'BLOQUEADO' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {b.tipo}
            </span>
            <span className="text-gray-400">{formatFecha(b.createdAt)}</span>
          </div>
          <p className="text-gray-600 dark:text-gray-300">{b.motivo}</p>
          <p className="text-gray-400 mt-0.5">Operador: {b.operadorRef}</p>
        </div>
      ))}
    </div>
  );
}

function HistorialModal({ vecino, onClose, onDesbloquear, desbloqueando }: HistorialModalProps) {
  const esBloqueado = vecino.estado !== 'ACTIVO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-gray-500" />
            <span className="font-bold text-gray-800 dark:text-gray-100">
              {vecino.nombres} {vecino.apellidos}
            </span>
            <EstadoBadge estado={vecino.estado} />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl py-3">
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{vecino.contadorFalsas}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Falsas alarmas</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl py-3 col-span-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Última alerta</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatFecha(vecino.ultimaAlerta)}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Historial de bloqueos
            </p>
            <HistorialBloqueos usuarioId={vecino.id} />
          </div>

          {esBloqueado && (
            <button
              disabled={desbloqueando}
              onClick={onDesbloquear}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
            >
              {desbloqueando
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <RotateCcw className="h-4 w-4" />
              }
              Desbloquear usuario
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal bloquear desde tabla ────────────────────────────────────────────────

interface BloquearModalProps {
  vecino: VecinoApp;
  onConfirm: (motivo: string, tipo: 'BLOQUEADO' | 'SUSPENDIDO') => void;
  onClose: () => void;
  cargando: boolean;
}

function BloquearModal({ vecino, onConfirm, onClose, cargando }: BloquearModalProps) {
  const [motivo, setMotivo] = useState('');
  const [tipo, setTipo] = useState<'BLOQUEADO' | 'SUSPENDIDO'>('BLOQUEADO');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-red-600" />
            <span className="font-bold text-gray-800 dark:text-gray-100">Bloquear vecino</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>{vecino.nombres} {vecino.apellidos}</strong> · DNI {vecino.dni}
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
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Motivo <span className="text-red-500">*</span>
            </label>
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
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

type FiltroEstado = 'TODOS' | 'ACTIVO' | 'BLOQUEADO' | 'SUSPENDIDO';

export default function VecinosAppPage() {
  const { data: vecinos = [], isLoading } = useVecinosApp();
  const desbloquear = useDesbloquearUsuario();
  const bloquear    = useBloquearUsuarioPanico();

  const [filtro, setFiltro]               = useState<FiltroEstado>('TODOS');
  const [historialVecino, setHistorialVecino] = useState<VecinoApp | null>(null);
  const [bloquearVecino, setBloquearVecino]   = useState<VecinoApp | null>(null);

  const filtrados = vecinos.filter((v) => filtro === 'TODOS' || v.estado === filtro);

  const totales = {
    activos:    vecinos.filter((v) => v.estado === 'ACTIVO').length,
    bloqueados: vecinos.filter((v) => v.estado === 'BLOQUEADO').length,
    suspendidos: vecinos.filter((v) => v.estado === 'SUSPENDIDO').length,
    conFalsas:  vecinos.filter((v) => v.contadorFalsas > 0).length,
  };

  function extractMsg(e: any, fallback: string): string {
    const raw = e?.response?.data?.message;
    return typeof raw === 'string' ? raw : (e?.message ?? fallback);
  }

  async function confirmarBloqueo(motivo: string, tipo: 'BLOQUEADO' | 'SUSPENDIDO') {
    if (!bloquearVecino) return;
    try {
      await bloquear.mutateAsync({ dni: bloquearVecino.dni, motivo, tipo, operadorRef: 'cecom-operador' });
      toast.success(`Vecino bloqueado (${tipo})`);
      setBloquearVecino(null);
    } catch (e: any) {
      toast.error(extractMsg(e, 'Error al bloquear vecino'));
    }
  }

  async function confirmarDesbloqueo(vecino: VecinoApp) {
    try {
      await desbloquear.mutateAsync({ usuarioId: vecino.id });
      toast.success(`${vecino.nombres} desbloqueado`);
      setHistorialVecino((prev) => prev ? { ...prev, estado: 'ACTIVO' } : null);
    } catch (e: any) {
      toast.error(extractMsg(e, 'Error al desbloquear'));
    }
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Users className="h-5 w-5 text-green-600" />
          Vecinos App — Registro
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Vecinos registrados en la app Vecino Seguro SJL
        </p>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{totales.activos}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Activos</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{totales.bloqueados}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Bloqueados</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{totales.suspendidos}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Suspendidos</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{totales.conFalsas}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Con falsas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {(['TODOS', 'ACTIVO', 'BLOQUEADO', 'SUSPENDIDO'] as FiltroEstado[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filtro === f
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f === 'TODOS' ? 'Todos' : f === 'ACTIVO' ? 'Activos' : f === 'BLOQUEADO' ? 'Bloqueados' : 'Suspendidos'}
            {f !== 'TODOS' && (
              <span className="ml-1.5 opacity-70">
                ({f === 'ACTIVO' ? totales.activos : f === 'BLOQUEADO' ? totales.bloqueados : totales.suspendidos})
              </span>
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Vecino</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">DNI</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Falsas</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Última alerta</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Registrado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading
                ? [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : filtrados.length === 0
                ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-600">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay vecinos{filtro !== 'TODOS' ? ` con estado ${filtro}` : ''}</p>
                    </td>
                  </tr>
                )
                : filtrados.map((vecino) => (
                  <tr
                    key={vecino.id}
                    className={`transition-colors ${
                      vecino.estado !== 'ACTIVO'
                        ? 'bg-red-50/30 dark:bg-red-900/10'
                        : vecino.contadorFalsas >= 3
                        ? 'bg-orange-50/30 dark:bg-orange-900/10'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-gray-100">
                        {vecino.nombres} {vecino.apellidos}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{vecino.dni}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{vecino.telefono}</td>
                    <td className="px-4 py-3"><EstadoBadge estado={vecino.estado} /></td>
                    <td className="px-4 py-3">
                      {vecino.contadorFalsas > 0
                        ? (
                          <span className={`inline-flex items-center gap-1 font-semibold text-xs ${
                            vecino.contadorFalsas >= 3 ? 'text-red-600 dark:text-red-400' : 'text-orange-500'
                          }`}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {vecino.contadorFalsas}
                          </span>
                        )
                        : <span className="text-gray-400 text-xs">0</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
                      {formatFecha(vecino.ultimaAlerta)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 dark:text-gray-500 whitespace-nowrap text-xs">
                      {formatFecha(vecino.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => setHistorialVecino(vecino)}
                          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 px-2 py-1 rounded-lg transition-colors"
                          title="Ver historial"
                        >
                          <History className="h-3.5 w-3.5" />
                          Historial
                        </button>
                        {vecino.estado === 'ACTIVO'
                          ? (
                            <button
                              onClick={() => setBloquearVecino(vecino)}
                              className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-300 dark:border-red-700 px-2 py-1 rounded-lg transition-colors"
                              title="Bloquear"
                            >
                              <Lock className="h-3.5 w-3.5" />
                              Bloquear
                            </button>
                          )
                          : (
                            <button
                              onClick={() => confirmarDesbloqueo(vecino)}
                              disabled={desbloquear.isPending}
                              className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-300 dark:border-green-700 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                              title="Desbloquear"
                            >
                              {desbloquear.isPending
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <ShieldCheck className="h-3.5 w-3.5" />
                              }
                              Desbloquear
                            </button>
                          )
                        }
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {!isLoading && filtrados.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {filtrados.length} vecino{filtrados.length !== 1 ? 's' : ''} · {vecinos.length} total registrados
            </p>
          </div>
        )}
      </div>

      {/* Modal historial */}
      {historialVecino && (
        <HistorialModal
          vecino={historialVecino}
          onClose={() => setHistorialVecino(null)}
          onDesbloquear={() => confirmarDesbloqueo(historialVecino)}
          desbloqueando={desbloquear.isPending}
        />
      )}

      {/* Modal bloquear */}
      {bloquearVecino && (
        <BloquearModal
          vecino={bloquearVecino}
          onConfirm={confirmarBloqueo}
          onClose={() => setBloquearVecino(null)}
          cargando={bloquear.isPending}
        />
      )}
    </div>
  );
}
