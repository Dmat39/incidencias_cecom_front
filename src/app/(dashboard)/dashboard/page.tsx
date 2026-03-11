'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIncidenciasStats } from '@/hooks/useIncidencias';
import { useSocket } from '@/hooks/useSocket';
import StatsCards from '@/components/dashboard/StatsCards';
import EstadoBadge from '@/components/incidencias/EstadoBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/date';
import type { Incidencia } from '@/types';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#6b7280', '#3b82f6'];

function getWeekStart() {
  const now  = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const lunes = new Date(now);
  lunes.setDate(now.getDate() + diff);
  return lunes.toISOString().split('T')[0];
}
const TODAY = new Date().toISOString().split('T')[0];

export default function DashboardPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [fechaInicio, setFechaInicio] = useState(getWeekStart());
  const [fechaFin,    setFechaFin]    = useState(TODAY);

  const { data: stats, isLoading } = useIncidenciasStats(fechaInicio, fechaFin);

  useSocket({
    'nueva-incidencia': (inc: Incidencia) => {
      toast.success(`Nueva incidencia: ${inc.codigoIncidencia || 'Sin código'}`, { duration: 5000 });
      qc.invalidateQueries({ queryKey: ['incidencias'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Filtro de fechas */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Desde</label>
          <input
            type="date"
            value={fechaInicio}
            max={fechaFin}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Hasta</label>
          <input
            type="date"
            value={fechaFin}
            min={fechaInicio}
            max={TODAY}
            onChange={(e) => setFechaFin(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          onClick={() => { setFechaInicio(getWeekStart()); setFechaFin(TODAY); }}
          className="text-xs text-green-600 hover:underline font-medium"
        >
          Esta semana
        </button>
      </div>

      <StatsCards stats={stats} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-700">Distribución por Estado (Hoy)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats?.byEstado || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(stats?.byEstado || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Incidencias']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent incidents */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-700">Últimas Incidencias</CardTitle>
            <button
              onClick={() => router.push('/incidencias')}
              className="text-xs text-green-600 hover:underline font-medium"
            >
              Ver todas →
            </button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-auto">
                {(stats?.recientes || []).map((inc: Incidencia) => (
                  <div
                    key={inc.id}
                    onClick={() => router.push(`/incidencias/${inc.id}`)}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer border-l-4 border-l-gray-200 bg-white border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {inc.codigoIncidencia || `#${inc.id}`}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {inc.tipoCaso?.descripcion || 'Sin tipo'} · {inc.direccion || 'Sin dirección'}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex flex-col items-end gap-1">
                      <EstadoBadge estado={inc.situacion?.descripcion} />
                      {inc.registradoEn && (
                        <span className="text-xs text-gray-400">
                          {formatDate(inc.registradoEn, 'HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {(stats?.recientes || []).length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-6">No hay incidencias hoy</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
