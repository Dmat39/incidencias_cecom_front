'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';
import { usePanicoAlertasMapa } from '@/hooks/usePanicoAlertas';
import { useSocket } from '@/hooks/useSocket';
import { Layers, MapPin, CalendarDays, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PanicoAlerta } from '@/hooks/usePanicoAlertas';

const PanicoMapView = dynamic(() => import('@/components/mapa/PanicoMapView'), { ssr: false });

const LAYERS = [
  { id: 'RECIBIDA',   label: 'Recibida',     description: 'Sin atender',    color: '#ef4444' },
  { id: 'ATENDIENDO', label: 'En Atención',  description: 'Siendo atendidas', color: '#f59e0b' },
  { id: 'FINALIZADA', label: 'Finalizada',   description: 'Resueltas',       color: '#22c55e' },
  { id: 'FALSA',      label: 'Falsa Alarma', description: 'Falsas alertas',  color: '#6b7280' },
];

function todayStr() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
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

export default function MapaAlertasSjlPage() {
  const qc = useQueryClient();

  const [draftFecha, setDraftFecha]   = useState(todayStr());
  const [appliedFecha, setAppliedFecha] = useState(todayStr());
  const [sinFiltro, setSinFiltro]     = useState(false);
  const pendingChanges = draftFecha !== appliedFecha;

  const { data: alertas = [], isLoading } = usePanicoAlertasMapa(sinFiltro ? undefined : appliedFecha);

  const [panelOpen, setPanelOpen] = useState(true);
  const [visible, setVisible] = useState<Record<string, boolean>>({
    RECIBIDA: true, ATENDIENDO: true, FINALIZADA: true, FALSA: true,
  });

  const visibleAlertas = alertas.filter((a: PanicoAlerta) => visible[a.estadoApp ?? ''] ?? false);

  function countLayer(id: string) {
    return alertas.filter((a: PanicoAlerta) => a.estadoApp === id).length;
  }

  function aplicarFiltro() {
    setSinFiltro(false);
    setAppliedFecha(draftFecha);
  }

  function setHoy() {
    const t = todayStr();
    setSinFiltro(false);
    setDraftFecha(t);
    setAppliedFecha(t);
  }

  function setTodas() {
    setSinFiltro(true);
  }

  useSocket({
    'alerta-panico-nueva':       () => qc.invalidateQueries({ queryKey: ['panico', 'mapa'] }),
    'alerta-panico-actualizada': () => qc.invalidateQueries({ queryKey: ['panico', 'mapa'] }),
  });

  return (
    <div className="flex h-full overflow-hidden">
      {/* Panel izquierdo */}
      <div
        className={`flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700/60 flex flex-col transition-all duration-300 overflow-hidden
          ${panelOpen ? 'w-60' : 'w-0'}`}
      >
        {/* Filtro de Fecha */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700/60 flex-shrink-0">
          <p className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 text-sm mb-2.5">
            <CalendarDays className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            Filtro de Fecha
          </p>

          <div className="flex gap-1.5 mb-2.5">
            <button
              onClick={setHoy}
              className={`flex-1 text-xs py-1 rounded border font-medium transition-colors
                ${!sinFiltro && appliedFecha === todayStr()
                  ? 'bg-red-600 text-white border-red-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              Hoy
            </button>
            <button
              onClick={setTodas}
              className={`flex-1 text-xs py-1 rounded border font-medium transition-colors
                ${sinFiltro
                  ? 'bg-red-600 text-white border-red-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              Todas
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-0.5">Fecha</label>
            <input
              type="date"
              value={draftFecha}
              max={todayStr()}
              onChange={(e) => { setSinFiltro(false); setDraftFecha(e.target.value); }}
              className="w-full h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-red-500"
            />
          </div>

          <button
            onClick={aplicarFiltro}
            disabled={!pendingChanges || sinFiltro}
            className={`mt-2.5 w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded font-medium transition-colors
              ${pendingChanges && !sinFiltro
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-100 dark:bg-gray-700/60 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
          >
            <Search className="h-3 w-3" />
            {pendingChanges && !sinFiltro ? 'Aplicar filtro' : 'Filtro aplicado'}
          </button>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {isLoading ? 'Cargando...' : `${alertas.length} alertas en rango`}
          </p>
        </div>

        {/* Control de Capas */}
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
                <MapPin style={{ color: layer.color }} className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">{layer.label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{countLayer(layer.id)} alertas</p>
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
                <div
                  className="flex-shrink-0 rounded-full border-2 border-white dark:border-gray-800 shadow"
                  style={{
                    width:  layer.id === 'RECIBIDA' ? 14 : layer.id === 'ATENDIENDO' ? 12 : 10,
                    height: layer.id === 'RECIBIDA' ? 14 : layer.id === 'ATENDIENDO' ? 12 : 10,
                    backgroundColor: layer.color,
                  }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{layer.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {visibleAlertas.length} marcadores visibles
            </span>
          </div>
        </div>
      </div>

      {/* Área del mapa */}
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

        {isLoading ? (
          <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Cargando mapa...</span>
            </div>
          </div>
        ) : (
          <PanicoMapView alertas={visibleAlertas} />
        )}
      </div>
    </div>
  );
}
