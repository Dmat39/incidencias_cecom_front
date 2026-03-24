'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import apiSvi from '@/lib/apiSvi';
import { useSviAuthStore } from '@/store/sviAuthStore';
import HistorialTabla from '@/components/svi/HistorialTabla';
import { Button } from '@/components/ui/button';
import { Download, History } from 'lucide-react';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const TURNO_MAP: Record<string, string> = {
  Mañana: 'MANANA', Tarde: 'TARDE', Noche: 'NOCHE',
  'No Definido': 'UNDEFINED', Rotativo: 'ROTATIVO',
};
const TURNO_MAP_INV: Record<string, string> = Object.fromEntries(
  Object.entries(TURNO_MAP).map(([k, v]) => [v, k]),
);

const TURNOS = ['Mañana', 'Tarde', 'Noche', 'No Definido', 'Rotativo'];

export default function SviHistorialPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const pathname    = usePathname();
  const { token }   = useSviAuthStore();

  const [turno, setTurno]         = useState(TURNO_MAP_INV[searchParams.get('turno') ?? ''] ?? 'Mañana');
  const [fecha, setFecha]         = useState(searchParams.get('fecha') ?? dayjs().format('YYYY-MM-DD'));
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);

  function buildQuery(t: string, f: string) {
    return `?turno=${TURNO_MAP[t]}&fecha=${f}`;
  }

  async function fetchHistorial(query: string) {
    setLoading(true);
    try {
      const [jurisRes, histRes] = await Promise.all([
        apiSvi.get('/serenos/jurisdicciones'),
        apiSvi.get(`/incidencias/historial${query}`),
      ]);
      if (histRes.data && histRes.data.length > 0) {
        const jurisdicciones = jurisRes.data?.data ?? [];
        const data = histRes.data.map((inc: any) => ({
          ...inc,
          jurisdiccion: jurisdicciones.find((j: any) => j.id === inc.jurisdiccion_id)?.nombre ?? 'Sin jurisdicción',
        }));
        setHistorial(data);
      } else {
        setHistorial([]);
      }
    } catch {
      setHistorial([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const q = buildQuery(turno, fecha);
    fetchHistorial(q);
  }, []);

  function handleTurnoChange(value: string) {
    setTurno(value);
    const q = buildQuery(value, fecha);
    router.replace(`${pathname}${q}`);
    fetchHistorial(q);
  }

  function handleFechaChange(value: string) {
    setFecha(value);
    const q = buildQuery(turno, value);
    router.replace(`${pathname}${q}`);
    fetchHistorial(q);
  }

  function exportToExcel() {
    if (historial.length === 0) return;
    const maxCodigos = Math.max(...historial.map((d: any) =>
      d.users.reduce((m: number, u: any) => Math.max(m, u.codigo_incidencias.length), 0)
    ));
    const headers = ['JURISDICCION', 'SERENOS', 'CODIGO', ...Array(maxCodigos - 1).fill(''), 'CUENTA'];
    const rows: any[] = [];
    let totalCuenta = 0;
    historial.forEach(({ jurisdiccion, users }: any) => {
      users.forEach(({ nombre_reportante, codigo_incidencias }: any) => {
        const row = [jurisdiccion, nombre_reportante, ...codigo_incidencias];
        while (row.length < headers.length - 1) row.push('');
        row.push(codigo_incidencias.length);
        totalCuenta += codigo_incidencias.length;
        rows.push(row);
      });
    });
    const totalRow = Array(headers.length - 1).fill('');
    totalRow.push(totalCuenta);
    rows.push(totalRow);
    const title = [`HISTORIAL DE INCIDENCIAS TURNO ${turno.toUpperCase()} - ${dayjs(fecha).format('DD/MM/YYYY')}`];
    while (title.length < headers.length) title.push('');
    const ws = XLSX.utils.aoa_to_sheet([title, headers, ...rows]);
    ws['!cols'] = [{ wch: 40 }, { wch: 60 }, ...Array(maxCodigos).fill({ wch: 15 }), { wch: 10 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    XLSX.writeFile(wb, `Historial_${dayjs(fecha).format('DD-MM-YYYY')}.xlsx`);
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Historial de Incidencias — SVI</h1>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={turno}
          onChange={(e) => handleTurnoChange(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <input
          type="date"
          value={fecha}
          onChange={(e) => handleFechaChange(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />

        <Button variant="outline" size="sm" onClick={exportToExcel} disabled={historial.length === 0}>
          <Download className="h-4 w-4 mr-1" /> Descargar Excel
        </Button>
      </div>

      {/* Tabla */}
      <HistorialTabla tableData={historial} isLoading={loading} />
    </div>
  );
}
