'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Trophy, Users, TrendingUp, BarChart2, Sun, Sunset, Moon, Calendar,
} from 'lucide-react';
import api from '@/lib/api';

/* ─── helpers timezone Lima ─────────────────────────────── */
function todayLima() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
}
function weekStartLima() {
  const ref = new Date(todayLima() + 'T12:00:00Z');
  const day = ref.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  ref.setDate(ref.getDate() + diff);
  return ref.toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
}
function monthStartLima() {
  return todayLima().slice(0, 8) + '01';
}

/* ─── tipos ─────────────────────────────────────────────── */
interface TurnoData { mañana: number; tarde: number; noche: number }
interface OperadorData {
  id: number;
  nombres: string;
  apellidos: string | null;
  username: string | null;
  total: number;
  promedioDiario: number;
  porSeveridad: { nombre: string; count: number }[];
  porSituacion: { nombre: string; count: number }[];
  porTurno: TurnoData;
}
interface MetricasResponse {
  operadores: OperadorData[];
  totalPeriodo: number;
  diasRango: number;
}

/* ─── colores ────────────────────────────────────────────── */
const PODIUM_COLORS = ['#F59E0B', '#94A3B8', '#B45309'];
const BAR_COLORS   = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#A855F7', '#06B6D4', '#EC4899', '#84CC16'];
const SEV_COLORS: Record<string, string> = { Alta: '#EF4444', Media: '#F59E0B', Baja: '#22C55E' };

function nombreCompleto(op: OperadorData) {
  return [op.nombres, op.apellidos].filter(Boolean).join(' ') || op.username || `Op #${op.id}`;
}
function iniciales(op: OperadorData) {
  const n = op.nombres?.[0] ?? '';
  const a = op.apellidos?.[0] ?? '';
  return (n + a).toUpperCase() || (op.username?.[0]?.toUpperCase() ?? '?');
}

/* ─── componente principal ───────────────────────────────── */
export default function MetricasPage() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';

  const [fechaInicio, setFechaInicio] = useState(`${new Date().getFullYear()}-01-01`);
  const [fechaFin,   setFechaFin]   = useState(todayLima());

  const chartColors = {
    grid:    dark ? '#374151' : '#E5E7EB',
    tick:    dark ? '#9CA3AF' : '#6B7280',
    tooltip: dark ? '#1F2937' : '#FFFFFF',
    tooltipBorder: dark ? '#374151' : '#E5E7EB',
    tooltipText:   dark ? '#F9FAFB' : '#111827',
  };

  const { data, isLoading, isError, error } = useQuery<MetricasResponse>({
    queryKey: ['metricas-operadores', fechaInicio, fechaFin],
    queryFn: async () => {
      const res = await api.get('/incidencias/metricas/operadores', {
        params: { fechaInicio, fechaFin },
      });
      return res.data?.data ?? res.data;
    },
    retry: 1,
  });

  function setRango(tipo: 'hoy' | 'semana' | 'mes' | 'año') {
    if (tipo === 'hoy')   { setFechaInicio(todayLima());      setFechaFin(todayLima()); }
    if (tipo === 'semana'){ setFechaInicio(weekStartLima());  setFechaFin(todayLima()); }
    if (tipo === 'mes')   { setFechaInicio(monthStartLima()); setFechaFin(todayLima()); }
    if (tipo === 'año')   { setFechaInicio(`${new Date().getFullYear()}-01-01`); setFechaFin(todayLima()); }
  }

  const operadores = data?.operadores ?? [];
  const top3       = operadores.slice(0, 3);

  // Datos para gráfico de barras horizontal (top 10)
  const barData = useMemo(() =>
    operadores.slice(0, 10).map((op) => ({
      name: op.nombres?.split(' ')[0] || op.username || `Op${op.id}`,
      total: op.total,
      promedio: op.promedioDiario,
    })),
  [operadores]);

  // Agregado de severidad global
  const severidadGlobal = useMemo(() => {
    const map: Record<string, number> = {};
    operadores.forEach((op) => op.porSeveridad.forEach(({ nombre, count }) => {
      map[nombre] = (map[nombre] || 0) + count;
    }));
    return Object.entries(map).map(([nombre, count]) => ({ nombre, count })).sort((a, b) => b.count - a.count);
  }, [operadores]);

  // Turno global
  const turnoGlobal = useMemo(() => {
    let m = 0, t = 0, n = 0;
    operadores.forEach((op) => { m += op.porTurno.mañana; t += op.porTurno.tarde; n += op.porTurno.noche; });
    return { mañana: m, tarde: t, noche: n };
  }, [operadores]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: chartColors.tooltip, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8, padding: '10px 14px' }}>
        <p style={{ color: chartColors.tooltipText, fontWeight: 600, marginBottom: 4 }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color, fontSize: 13 }}>{p.name}: <strong>{p.value}</strong></p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight flex items-center gap-2">
            <BarChart2 className="h-7 w-7 text-green-600" />
            Métricas de Operadores
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            CECOM · San Juan de Lurigancho
            {data && (
              <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                · {data.totalPeriodo} incidencias en {data.diasRango} día{data.diasRango !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        {/* Filtros de fecha */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex gap-1">
            {(['hoy', 'semana', 'mes', 'año'] as const).map((r) => (
              <Button key={r} variant="outline" size="sm" onClick={() => setRango(r)}
                className="text-xs capitalize dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                {r === 'hoy' ? 'Hoy' : r === 'semana' ? 'Esta semana' : r === 'mes' ? 'Este mes' : 'Este año'}
              </Button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400">Desde</Label>
              <Input type="date" value={fechaInicio} max={fechaFin}
                onChange={(e) => setFechaInicio(e.target.value || weekStartLima())}
                className="h-8 text-xs dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400">Hasta</Label>
              <Input type="date" value={fechaFin} min={fechaInicio} max={todayLima()}
                onChange={(e) => setFechaFin(e.target.value || todayLima())}
                className="h-8 text-xs dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-10 w-10 border-4 border-green-500 border-t-transparent rounded-full" />
        </div>
      ) : isError ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700 border-red-200 dark:border-red-800">
          <CardContent className="py-16 text-center">
            <p className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Error al cargar los datos</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {(error as any)?.response?.data?.message || (error as any)?.message || 'No se pudo conectar con el servidor'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Verifica que el servidor backend esté corriendo y reiniciado con los últimos cambios.
            </p>
          </CardContent>
        </Card>
      ) : operadores.length === 0 ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="py-16 text-center text-gray-400 dark:text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
            {data && data.totalPeriodo > 0 ? (
              <>
                <p className="text-lg font-medium">Se encontraron {data.totalPeriodo} incidencia{data.totalPeriodo !== 1 ? 's' : ''} pero sin operador registrado</p>
                <p className="text-xs mt-1">Los incidentes no tienen usuario asignado. Verifica que el backend esté actualizado.</p>
              </>
            ) : (
              <p className="text-lg font-medium">Sin datos en el período seleccionado</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── KPIs globales ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={<Users className="h-5 w-5 text-blue-500" />}
              label="Operadores activos" value={operadores.length} color="blue" />
            <KpiCard icon={<TrendingUp className="h-5 w-5 text-green-500" />}
              label="Total incidencias" value={data?.totalPeriodo ?? 0} color="green" />
            <KpiCard
              icon={<Trophy className="h-5 w-5 text-amber-500" />}
              label="Líder del período"
              value={nombreCompleto(operadores[0]).split(' ')[0]}
              sub={`${operadores[0].total} registros`}
              color="amber"
            />
            <KpiCard
              icon={<Calendar className="h-5 w-5 text-purple-500" />}
              label="Promedio diario total"
              value={operadores.length ? (data!.totalPeriodo / data!.diasRango).toFixed(1) : '0'}
              sub="incidencias/día"
              color="purple"
            />
          </div>

          {/* ── Podio Top 3 ── */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <Trophy className="h-5 w-5 text-amber-500" />
                Top 3 Operadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-center gap-4 pt-2">
                {/* 2do lugar */}
                {top3[1] && (
                  <PodiumCard op={top3[1]} pos={2} color={PODIUM_COLORS[1]} height="h-28" />
                )}
                {/* 1er lugar */}
                {top3[0] && (
                  <PodiumCard op={top3[0]} pos={1} color={PODIUM_COLORS[0]} height="h-40" />
                )}
                {/* 3er lugar */}
                {top3[2] && (
                  <PodiumCard op={top3[2]} pos={3} color={PODIUM_COLORS[2]} height="h-20" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Gráfico de barras por operador ── */}
          {barData.length > 0 && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-800 dark:text-gray-100">
                  Incidencias por operador (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} margin={{ left: 0, right: 20, top: 10, bottom: 5 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.grid} />
                    <XAxis type="number" tick={{ fill: chartColors.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={72} tick={{ fill: chartColors.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {barData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* ── Severidad + Turno globales ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Severidad global */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-800 dark:text-gray-100">Distribución por severidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {severidadGlobal.map(({ nombre, count }) => {
                  const total = severidadGlobal.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const color = SEV_COLORS[nombre] || '#6B7280';
                  return (
                    <div key={nombre} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{nombre}</span>
                        <span className="text-gray-500 dark:text-gray-400">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Turno global */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-800 dark:text-gray-100">Actividad por turno</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Mañana', icon: <Sun className="h-4 w-4 text-amber-400" />, value: turnoGlobal.mañana, color: '#F59E0B' },
                  { label: 'Tarde',  icon: <Sunset className="h-4 w-4 text-orange-400" />, value: turnoGlobal.tarde, color: '#F97316' },
                  { label: 'Noche',  icon: <Moon className="h-4 w-4 text-indigo-400" />, value: turnoGlobal.noche, color: '#6366F1' },
                ].map(({ label, icon, value, color }) => {
                  const total = turnoGlobal.mañana + turnoGlobal.tarde + turnoGlobal.noche;
                  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                  return (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-sm items-center">
                        <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">{icon}{label}</span>
                        <span className="text-gray-500 dark:text-gray-400">{value} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* ── Ranking detallado ── */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Ranking completo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 w-10">#</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Operador</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Total</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Prom/día</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 hidden md:table-cell">Severidad</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 hidden lg:table-cell">Turno</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 w-40">Participación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operadores.map((op, i) => {
                      const pct = data && data.totalPeriodo > 0 ? Math.round((op.total / data.totalPeriodo) * 100) : 0;
                      return (
                        <tr key={op.id}
                          className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                          <td className="py-3 px-4">
                            {i < 3 ? (
                              <span className="text-lg">{['🥇','🥈','🥉'][i]}</span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 font-medium">{i + 1}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}>
                                {iniciales(op)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 dark:text-gray-100 leading-tight">{nombreCompleto(op)}</p>
                                {op.username && <p className="text-xs text-gray-400 dark:text-gray-500">@{op.username}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-bold text-gray-900 dark:text-gray-100 text-base">{op.total}</span>
                          </td>
                          <td className="py-3 px-4 text-right hidden sm:table-cell">
                            <span className="text-gray-600 dark:text-gray-300">{op.promedioDiario}</span>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {op.porSeveridad.map(({ nombre, count }) => (
                                <Badge key={nombre} variant="outline"
                                  className="text-xs px-1.5 py-0 border"
                                  style={{ borderColor: SEV_COLORS[nombre] || '#6B7280', color: SEV_COLORS[nombre] || '#6B7280' }}>
                                  {nombre}: {count}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span title="Mañana">☀ {op.porTurno.mañana}</span>
                              <span title="Tarde">🌤 {op.porTurno.tarde}</span>
                              <span title="Noche">🌙 {op.porTurno.noche}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{ width: `${pct}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 w-9 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ─── sub-componentes ────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  const bg: Record<string, string> = {
    blue:   'bg-blue-50 dark:bg-blue-900/20',
    green:  'bg-green-50 dark:bg-green-900/20',
    amber:  'bg-amber-50 dark:bg-amber-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
  };
  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${bg[color]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-50 truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PodiumCard({ op, pos, color, height }: {
  op: OperadorData; pos: number; color: string; height: string;
}) {
  const medals = ['', '🥇', '🥈', '🥉'];
  return (
    <div className="flex flex-col items-center gap-2 w-36">
      <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg"
        style={{ background: color }}>
        {iniciales(op)}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight truncate max-w-[130px]">
          {nombreCompleto(op)}
        </p>
        {op.username && <p className="text-xs text-gray-400 dark:text-gray-500">@{op.username}</p>}
      </div>
      <div className={`w-full ${height} rounded-t-lg flex flex-col items-center justify-center gap-1`}
        style={{ background: color + '22', border: `2px solid ${color}` }}>
        <span className="text-2xl">{medals[pos]}</span>
        <span className="text-2xl font-extrabold" style={{ color }}>{op.total}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">incidencias</span>
      </div>
    </div>
  );
}
