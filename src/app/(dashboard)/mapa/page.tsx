'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useIncidenciasMapa } from '@/hooks/useIncidencias';
import { useSocket } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { Layers, MapPin, LocateFixed, ChevronLeft, ChevronRight, CalendarDays, Search, Clock } from 'lucide-react';
import type { Incidencia } from '@/types';
import type { MapaFilters } from '@/hooks/useIncidencias';

const MapView = dynamic(() => import('@/components/mapa/MapView'), { ssr: false });

const LAYERS = [
  { id: 'pendiente', label: 'Pendiente',   description: 'Sin atender',       color: '#ef4444' },
  { id: 'atencion',  label: 'En Atención', description: 'Siendo atendidas',  color: '#f59e0b' },
  { id: 'atendida',  label: 'Atendida',    description: 'Ya resueltas',      color: '#22c55e' },
  { id: 'cerrada',   label: 'Cerrada',     description: 'Expediente cerrado',color: '#6b7280' },
];

function todayStr() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
}

function weekStartStr() {
  const today = todayStr();
  const d = new Date(today + 'T12:00:00Z');
  d.setDate(d.getDate() - 6);
  return d.toISOString().split('T')[0];
}

function matchLayer(id: string, estado?: string): boolean {
  const l = (estado || '').toLowerCase();
  if (id === 'pendiente') return l.includes('pendiente');
  if (id === 'atencion')  return l.includes('atencion') || l.includes('atención');
  if (id === 'atendida')  return l.includes('atendida');
  if (id === 'cerrada')   return l.includes('cerrada');
  return false;
}

function LayerSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none
        ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200
        ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  );
}

export default function MapaPage() {
  const qc = useQueryClient();

  const [draftInicio, setDraftInicio] = useState(todayStr());
  const [draftFin,    setDraftFin]    = useState(todayStr());
  const [appliedInicio, setAppliedInicio] = useState(todayStr());
  const [appliedFin,    setAppliedFin]    = useState(todayStr());
  const [turno, setTurno] = useState<MapaFilters['turno']>(undefined);

  const pendingChanges = draftInicio !== appliedInicio || draftFin !== appliedFin;

  const filters: MapaFilters = { fechaInicio: appliedInicio, fechaFin: appliedFin, turno };
  const { data: mapaData, isLoading } = useIncidenciasMapa(filters);
  const [panelOpen, setPanelOpen] = useState(true);

  const [visible, setVisible] = useState<Record<string, boolean>>({
    pendiente: true, atencion: true, atendida: true, cerrada: true,
  });

  const withCoords: Incidencia[] = mapaData || [];
  const visibleIncidencias = withCoords.filter((inc) =>
    LAYERS.some((l) => visible[l.id] && matchLayer(l.id, inc.situacion?.descripcion))
  );

  function countLayer(id: string) {
    return withCoords.filter((i) => matchLayer(id, i.situacion?.descripcion)).length;
  }

  function setHoy() {
    const t = todayStr();
    setDraftInicio(t); setDraftFin(t);
    setAppliedInicio(t); setAppliedFin(t);
  }

  function setUltimos7() {
    const inicio = weekStartStr(); const fin = todayStr();
    setDraftInicio(inicio); setDraftFin(fin);
    setAppliedInicio(inicio); setAppliedFin(fin);
  }

  function handleDraftInicio(val: string) {
    setDraftInicio(val);
    if (draftFin < val) setDraftFin(val);
  }

  function aplicarFiltro() {
    setAppliedInicio(draftInicio);
    setAppliedFin(draftFin);
  }

  useSocket({
    'nueva-incidencia':       () => qc.invalidateQueries({ queryKey: ['incidencias', 'mapa'] }),
    'incidencia-actualizada': () => qc.invalidateQueries({ queryKey: ['incidencias', 'mapa'] }),
    'incidencia-atendida':    () => qc.invalidateQueries({ queryKey: ['incidencias', 'mapa'] }),
  });

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Panel izquierdo colapsable ── */}
      <div
        className={`flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700/60 flex flex-col transition-all duration-300 overflow-hidden
          ${panelOpen ? 'w-60' : 'w-0'}`}
      >
        {/* ── Filtro de Fecha ── */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700/60 flex-shrink-0">
          <p className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 text-sm mb-2.5">
            <CalendarDays className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            Filtro de Fecha
          </p>

          {/* Atajos rápidos */}
          <div className="flex gap-1.5 mb-2.5">
            <button
              onClick={setHoy}
              className={`flex-1 text-xs py-1 rounded border font-medium transition-colors
                ${appliedInicio === todayStr() && appliedFin === todayStr()
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              Hoy
            </button>
            <button
              onClick={setUltimos7}
              className={`flex-1 text-xs py-1 rounded border font-medium transition-colors
                ${appliedInicio === weekStartStr() && appliedFin === todayStr()
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              7 días
            </button>
          </div>

          {/* Inputs de fecha */}
          <div className="space-y-1.5">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-0.5">Desde</label>
              <input
                type="date"
                value={draftInicio}
                max={draftFin}
                onChange={(e) => handleDraftInicio(e.target.value)}
                className="w-full h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-0.5">Hasta</label>
              <input
                type="date"
                value={draftFin}
                min={draftInicio}
                max={todayStr()}
                onChange={(e) => setDraftFin(e.target.value)}
                className="w-full h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          {/* Botón Aplicar */}
          <button
            onClick={aplicarFiltro}
            disabled={!pendingChanges}
            className={`mt-2.5 w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded font-medium transition-colors
              ${pendingChanges
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-100 dark:bg-gray-700/60 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
          >
            <Search className="h-3 w-3" />
            {pendingChanges ? 'Aplicar filtro' : 'Filtro aplicado'}
          </button>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {isLoading ? 'Cargando...' : `${withCoords.length} incidencias en rango`}
          </p>
        </div>

        {/* ── Filtro de Turno ── */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700/60 flex-shrink-0">
          <p className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 text-sm mb-2.5">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            Turno
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { key: undefined,  label: 'Todos',   sub: 'Sin filtro' },
              { key: 'mañana',   label: 'Mañana',  sub: '6am – 2pm'  },
              { key: 'tarde',    label: 'Tarde',   sub: '2pm – 10pm' },
              { key: 'noche',    label: 'Noche',   sub: '10pm – 6am' },
            ] as const).map(({ key, label, sub }) => (
              <button
                key={label}
                onClick={() => setTurno(key)}
                className={`flex flex-col items-center py-1.5 px-1 rounded border text-xs font-medium transition-colors
                  ${turno === key
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <span>{label}</span>
                <span className={`text-[10px] font-normal ${turno === key ? 'text-green-100' : 'text-gray-400 dark:text-gray-500'}`}>{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Control de Capas ── */}
        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/40 flex-shrink-0">
          <p className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 text-sm">
            <Layers className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            Control de Capas
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {LAYERS.map((layer) => (
            <div key={layer.id}
              className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700/40 hover:bg-gray-50 dark:hover:bg-gray-800/60"
            >
              <div className="flex-shrink-0">
                {layer.id === 'pendiente'
                  ? <MapPin style={{ color: layer.color }} className="h-4 w-4" />
                  : <LocateFixed style={{ color: layer.color }} className="h-4 w-4" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">{layer.label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{countLayer(layer.id)} incidencias</p>
              </div>
              <LayerSwitch
                checked={visible[layer.id]}
                onChange={() => setVisible((v) => ({ ...v, [layer.id]: !v[layer.id] }))}
              />
            </div>
          ))}
        </div>

        {/* Leyenda */}
        <div className="border-t border-gray-200 dark:border-gray-700/60 px-4 py-3 flex-shrink-0">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">Leyenda</p>
          <div className="space-y-2">
            {LAYERS.map((layer) => (
              <div key={layer.id} className="flex items-center gap-2">
                <div className="flex-shrink-0 rounded-full border-2 border-white dark:border-gray-800 shadow"
                  style={{
                    width:  layer.id === 'pendiente' ? 14 : layer.id === 'atencion' ? 12 : 10,
                    height: layer.id === 'pendiente' ? 14 : layer.id === 'atencion' ? 12 : 10,
                    backgroundColor: layer.color,
                  }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{layer.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {visibleIncidencias.length} marcadores visibles
            </span>
          </div>
        </div>
      </div>

      {/* ── Botón toggle del panel (sobre el mapa) ── */}
      <div className="relative flex-1">
        <button
          onClick={() => setPanelOpen((v) => !v)}
          title={panelOpen ? 'Ocultar panel' : 'Mostrar panel'}
          className="absolute top-3 left-3 z-[1000] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-md w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {panelOpen
            ? <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            : <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          }
        </button>

        {/* Mapa */}
        {isLoading ? (
          <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Cargando mapa...</span>
            </div>
          </div>
        ) : (
          <MapView incidencias={visibleIncidencias} />
        )}
      </div>
    </div>
  );
}
