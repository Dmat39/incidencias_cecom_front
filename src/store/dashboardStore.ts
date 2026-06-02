import { create } from 'zustand';

function todayLima() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
}
function getLast30DaysStart() {
  const today = todayLima();
  const ref = new Date(today + 'T12:00:00Z');
  ref.setDate(ref.getDate() - 29);
  return ref.toISOString().split('T')[0];
}

interface DashboardFilters {
  fechaInicio: string;
  fechaFin: string;
  pendingInicio: string;
  pendingFin: string;
  hasDateChanges: boolean;
  tipoCasoIds: number[];
  subTipoCasoIds: number[];
  setFechaInicio: (v: string) => void;
  setFechaFin: (v: string) => void;
  setPendingInicio: (v: string) => void;
  setPendingFin: (v: string) => void;
  setHasDateChanges: (v: boolean) => void;
  setTipoCasoIds: (ids: number[]) => void;
  setSubTipoCasoIds: (ids: number[]) => void;
  applyDates: () => void;
  applyQuickRange: (inicio: string, fin: string) => void;
  clearFilters: () => void;
}

const TODAY = todayLima();
const LAST_30 = getLast30DaysStart();

export const useDashboardStore = create<DashboardFilters>((set, get) => ({
  fechaInicio:    LAST_30,
  fechaFin:       TODAY,
  pendingInicio:  LAST_30,
  pendingFin:     TODAY,
  hasDateChanges: false,
  tipoCasoIds:    [],
  subTipoCasoIds: [],

  setFechaInicio:    (v) => set({ fechaInicio: v }),
  setFechaFin:       (v) => set({ fechaFin: v }),
  setPendingInicio:  (v) => set({ pendingInicio: v }),
  setPendingFin:     (v) => set({ pendingFin: v }),
  setHasDateChanges: (v) => set({ hasDateChanges: v }),
  setTipoCasoIds:    (ids) => set({ tipoCasoIds: ids }),
  setSubTipoCasoIds: (ids) => set({ subTipoCasoIds: ids }),

  applyDates: () => {
    const { pendingInicio, pendingFin } = get();
    set({ fechaInicio: pendingInicio, fechaFin: pendingFin, hasDateChanges: false });
  },

  applyQuickRange: (inicio, fin) => {
    set({ pendingInicio: inicio, pendingFin: fin, fechaInicio: inicio, fechaFin: fin, hasDateChanges: false });
  },

  clearFilters: () => {
    set({ tipoCasoIds: [], subTipoCasoIds: [] });
  },
}));
