'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIncidenciasStats } from '@/hooks/useIncidencias';
import { useSocket } from '@/hooks/useSocket';
import EstadoBadge from '@/components/incidencias/EstadoBadge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Area, AreaChart,
} from 'recharts';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { formatDate } from '@/lib/date';
import {
  AlertTriangle, Clock, CheckCircle, XCircle, TrendingUp,
  Sun, Sunset, Moon, ShieldAlert, Activity,
} from 'lucide-react';
import type { Incidencia } from '@/types';

// ── Zona horaria Lima ────────────────────────────────────────────────────────
function todayLima() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
}
function getWeekStart() {
  const today = todayLima();
  const ref = new Date(today + 'T12:00:00Z');
  const day = ref.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  ref.setDate(ref.getDate() + diff);
  return ref.toISOString().split('T')[0];
}
function getMonthStart() {
  return todayLima().slice(0, 8) + '01';
}
const TODAY = todayLima();

// ── Colores por estado ───────────────────────────────────────────────────────
function getEstadoColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('pendiente')) return '#ef4444';
  if (n.includes('atendida'))  return '#22c55e';
  if (n.includes('atenci'))    return '#f59e0b';
  if (n.includes('cerrada'))   return '#9ca3af';
  if (n.includes('cancelada')) return '#374151';
  return '#d1d5db';
}

// ── Helpers UI ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, bg, sub }: {
  label: string; value: number | string; icon: any; color: string; bg: string; sub?: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex items-center gap-4 shadow-sm`}>
      <div className={`p-3 rounded-xl ${bg} flex-shrink-0`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-none">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm ${className}`}>
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const TURNO_COLORS = { mañana: '#f59e0b', tarde: '#3b82f6', noche: '#8b5cf6' };
const SEV_COLORS: Record<string, string> = { alta: '#ef4444', media: '#f59e0b', baja: '#22c55e' };

function getSevColor(name: string) {
  const n = name.toLowerCase();
  if (n.includes('alt')) return SEV_COLORS.alta;
  if (n.includes('med')) return SEV_COLORS.media;
  if (n.includes('baj')) return SEV_COLORS.baja;
  return '#9ca3af';
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';

  // Colores adaptativos para recharts
  const chartColors = {
    grid:    dark ? '#374151' : '#e5e7eb',
    tick:    dark ? '#9ca3af' : '#6b7280',
    tooltip: dark ? '#1f2937' : '#ffffff',
    tooltipBorder: dark ? '#374151' : '#e5e7eb',
    tooltipText: dark ? '#f3f4f6' : '#111827',
    legend:  dark ? '#d1d5db' : '#374151',
  };

  const [fechaInicio, setFechaInicio] = useState(getWeekStart());
  const [fechaFin, setFechaFin]       = useState(TODAY);

  const { data: stats, isLoading } = useIncidenciasStats(fechaInicio, fechaFin);

  useSocket({
    'nueva-incidencia': (inc: Incidencia) => {
      toast.success(`Nueva incidencia: ${inc.codigoIncidencia || 'Sin código'}`, { duration: 5000 });
      qc.invalidateQueries({ queryKey: ['incidencias'] });
    },
  });

  const tasaRespuesta = stats?.total > 0
    ? Math.round(((stats.atendidas ?? 0) / stats.total) * 100)
    : 0;

  const byEstadoFiltered = (stats?.byEstado || []).filter(
    (e: { name: string }) => e.name.toLowerCase() !== 'sin estado',
  );

  const porTurno = stats?.porTurno
    ? [
        { name: 'Mañana', value: stats.porTurno.mañana,  color: TURNO_COLORS.mañana,  icon: Sun },
        { name: 'Tarde',  value: stats.porTurno.tarde,   color: TURNO_COLORS.tarde,   icon: Sunset },
        { name: 'Noche',  value: stats.porTurno.noche,   color: TURNO_COLORS.noche,   icon: Moon },
      ]
    : [];

  const quickBtn = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border';
  const quickBtnActive = 'bg-green-600 text-white border-green-600';
  const quickBtnIdle   = 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-500 hover:text-green-600';

  const rangeLabel = fechaInicio === fechaFin ? fechaInicio : `${fechaInicio} → ${fechaFin}`;

  return (
    <div className="space-y-5">

      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Centro de Monitoreo — San Juan de Lurigancho
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Sistema de Gestión de Incidencias · CECOM · {rangeLabel}
          </p>
        </div>

        {/* Selector de fechas */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Desde</label>
            <input type="date" value={fechaInicio} max={fechaFin}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Hasta</label>
            <input type="date" value={fechaFin} min={fechaInicio} max={TODAY}
              onChange={(e) => setFechaFin(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex gap-1.5">
            {[
              { label: 'Hoy',       fn: () => { setFechaInicio(TODAY); setFechaFin(TODAY); } },
              { label: 'Semana',    fn: () => { setFechaInicio(getWeekStart()); setFechaFin(TODAY); } },
              { label: 'Mes',       fn: () => { setFechaInicio(getMonthStart()); setFechaFin(TODAY); } },
            ].map(({ label, fn }) => (
              <button key={label} onClick={fn} className={`${quickBtn} ${quickBtnIdle}`}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPIs principales ───────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard label="Total Incidencias"  value={stats?.total ?? 0}      icon={AlertTriangle} color="text-blue-600 dark:text-blue-400"   bg="bg-blue-50 dark:bg-blue-900/20" />
          <KpiCard label="Pendientes"          value={stats?.pendientes ?? 0} icon={Clock}         color="text-red-600 dark:text-red-400"     bg="bg-red-50 dark:bg-red-900/20" />
          <KpiCard label="En Atención"         value={stats?.enAtencion ?? 0} icon={XCircle}       color="text-yellow-600 dark:text-yellow-400" bg="bg-yellow-50 dark:bg-yellow-900/20" />
          <KpiCard label="Atendidas"           value={stats?.atendidas ?? 0}  icon={CheckCircle}   color="text-green-600 dark:text-green-400"  bg="bg-green-50 dark:bg-green-900/20" />
          <KpiCard label="Tasa de Respuesta"   value={`${tasaRespuesta}%`}   icon={TrendingUp}    color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-900/20" sub="incidencias atendidas" />
        </div>
      )}

      {/* ── Fila: Severidad + Turno + Estado ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Severidad */}
        <SectionCard title="Incidencias por Severidad">
          {isLoading ? <Skeleton className="h-32" /> : (
            <div className="space-y-4">
              {(stats?.bySeveridad ?? []).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">Sin datos</p>
              )}
              {(stats?.bySeveridad ?? []).map((s: { name: string; value: number }) => {
                const pct = stats?.total > 0 ? Math.round((s.value / stats.total) * 100) : 0;
                const color = getSevColor(s.name);
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" style={{ color }} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{s.value}</span>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Por Turno */}
        <SectionCard title="Incidencias por Turno">
          {isLoading ? <Skeleton className="h-32" /> : (
            <div className="space-y-4">
              {porTurno.map(({ name, value, color, icon: Icon }) => {
                const pct = stats?.total > 0 ? Math.round((value / stats.total) * 100) : 0;
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color }} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{value}</span>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Distribución por estado */}
        <SectionCard title="Distribución por Estado">
          {isLoading ? <Skeleton className="h-48" /> : (
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={byEstadoFiltered} cx="50%" cy="50%" innerRadius={48} outerRadius={75} paddingAngle={3} dataKey="value">
                  {byEstadoFiltered.map((e: { name: string }, i: number) => (
                    <Cell key={i} fill={getEstadoColor(e.name)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [v, 'Incidencias']}
                  contentStyle={{ backgroundColor: chartColors.tooltip, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8 }}
                  labelStyle={{ color: chartColors.tooltipText }}
                  itemStyle={{ color: chartColors.tooltipText }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: chartColors.legend }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* ── Tendencia diaria ────────────────────────────────────────────── */}
      {(stats?.tendencia ?? []).length > 1 && (
        <SectionCard title="Tendencia Diaria de Incidencias">
          {isLoading ? <Skeleton className="h-48" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats.tendencia} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={dark ? 0.4 : 0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: chartColors.tick }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: chartColors.tick }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(v) => `Fecha: ${v}`}
                  formatter={(v: number) => [v, 'Incidencias']}
                  contentStyle={{ backgroundColor: chartColors.tooltip, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8 }}
                  labelStyle={{ color: chartColors.tooltipText }}
                  itemStyle={{ color: chartColors.tooltipText }}
                />
                <Area type="monotone" dataKey="total" stroke="#16a34a" strokeWidth={2} fill="url(#gradGreen)" dot={{ r: 3, fill: '#16a34a' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      )}

      {/* ── Top Tipos y Subtipos ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top tipos de caso */}
        <SectionCard title="Top Tipos de Incidencia">
          {isLoading ? <Skeleton className="h-56" /> : (stats?.byTipoCaso ?? []).length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.byTipoCaso} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.grid} />
                <XAxis type="number" tick={{ fontSize: 11, fill: chartColors.tick }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: chartColors.tick }} tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + '…' : v} />
                <Tooltip
                  formatter={(v: number) => [v, 'Incidencias']}
                  contentStyle={{ backgroundColor: chartColors.tooltip, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8 }}
                  labelStyle={{ color: chartColors.tooltipText }}
                  itemStyle={{ color: chartColors.tooltipText }}
                />
                <Bar dataKey="value" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Top subtipos */}
        <SectionCard title="Top Subtipos de Incidencia">
          {isLoading ? <Skeleton className="h-56" /> : (stats?.bySubTipoCaso ?? []).length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.bySubTipoCaso} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.grid} />
                <XAxis type="number" tick={{ fontSize: 11, fill: chartColors.tick }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: chartColors.tick }} tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + '…' : v} />
                <Tooltip
                  formatter={(v: number) => [v, 'Incidencias']}
                  contentStyle={{ backgroundColor: chartColors.tooltip, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8 }}
                  labelStyle={{ color: chartColors.tooltipText }}
                  itemStyle={{ color: chartColors.tooltipText }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* ── Últimas incidencias ─────────────────────────────────────────── */}
      <SectionCard title="Últimas Incidencias Registradas">
        <div className="flex items-center justify-between mb-3 -mt-1">
          <span className="text-xs text-gray-400">Mostrando las 8 más recientes</span>
          <button onClick={() => router.push('/incidencias')}
            className="text-xs text-green-600 dark:text-green-400 font-semibold hover:underline">
            Ver todas →
          </button>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (stats?.recientes ?? []).length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">No hay incidencias en el período</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(stats.recientes ?? []).map((inc: any) => (
              <div key={inc.id} onClick={() => router.push(`/incidencias/${inc.id}`)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:border-green-300 dark:hover:border-green-700 cursor-pointer transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 font-mono group-hover:text-green-700 dark:group-hover:text-green-400">
                    {inc.codigoIncidencia || `#${inc.id}`}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {inc.tipoCaso?.descripcion || 'Sin tipo'}{inc.direccion ? ` · ${inc.direccion}` : ''}
                  </p>
                </div>
                <div className="ml-3 flex-shrink-0 flex flex-col items-end gap-1">
                  <EstadoBadge estado={inc.situacion?.descripcion} />
                  <span className="text-xs text-gray-400">{inc.registradoEn ? formatDate(inc.registradoEn, 'dd/MM HH:mm') : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

    </div>
  );
}
