import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type EstadoApp = 'RECIBIDA' | 'ATENDIENDO' | 'FINALIZADA' | 'FALSA';

export interface PanicoAlerta {
  id: number;
  nombreReportante: string | null;
  telefonoReportante: string | null;
  dniReportante: string | null;
  latitud: number | null;
  longitud: number | null;
  direccion: string | null;
  registradoEn: string | null;
  estadoApp: EstadoApp | null;
  operadorRef: string | null;
  situacion: { id: number; descripcion: string } | null;
  jurisdiccion: { id: number; nombre: string } | null;
  incidenciaCecom: { id: number; codigoIncidencia: string } | null;
}

export interface PanicoStats {
  hoy: number;
  semana: number;
  porJurisdiccion: { nombre: string; count: number }[];
  ultimas: PanicoAlerta[];
}

const KEYS = {
  alertas: (page: number, fecha?: string, estado?: string) => ['panico', 'alertas', page, fecha, estado] as const,
  stats: () => ['panico', 'stats'] as const,
};

export type FiltroEstadoAlerta = 'TODOS' | 'PENDIENTE' | 'ATENDIENDO' | 'ATENDIDA' | 'FALSA';

export function usePanicoAlertas(page = 1, fecha?: string, estado?: FiltroEstadoAlerta) {
  return useQuery({
    queryKey: KEYS.alertas(page, fecha, estado),
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (fecha) params.fecha = fecha;
      if (estado && estado !== 'TODOS') params.estado = estado;
      const { data } = await api.get('/panico-app/alertas', { params });
      return data.data as { data: PanicoAlerta[]; total: number; page: number; limit: number; totalPages: number };
    },
    refetchInterval: 30_000,
  });
}

export interface CambiarEstadoVars {
  panicAlertId: number;
  estado: 'RECIBIDA' | 'ATENDIENDO' | 'FINALIZADA' | 'FALSA';
  operadorRef?: string;
}

export interface BloquearUsuarioVars {
  dni: string;
  motivo: string;
  operadorRef: string;
  tipo?: 'BLOQUEADO' | 'SUSPENDIDO';
}

export function useCambiarEstadoAlerta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: CambiarEstadoVars) => {
      const { data } = await api.patch(`/panico-app/alertas/${vars.panicAlertId}/estado`, {
        estado: vars.estado,
        operadorRef: vars.operadorRef ?? 'cecom-operador',
      });
      return data.data as { alerta: any; sugerenciaBloqueo: any; datosPrellenados: any };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['panico'] }),
  });
}

export function useBloquearUsuarioPanico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: BloquearUsuarioVars) => {
      const { data } = await api.patch('/panico-app/usuarios/bloquear', vars);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['panico', 'vecinos'] }),
  });
}

export function usePanicoAlertasMapa(fecha?: string) {
  return useQuery({
    queryKey: ['panico', 'mapa', fecha],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: 1, limit: 500 };
      if (fecha) params.fecha = fecha;
      const { data } = await api.get('/panico-app/alertas', { params });
      const alertas = (data.data?.data ?? []) as PanicoAlerta[];
      return alertas.filter((a) => a.latitud != null && a.longitud != null);
    },
    refetchInterval: 30_000,
  });
}

export function usePanicoStats() {
  return useQuery({
    queryKey: KEYS.stats(),
    queryFn: async () => {
      const { data } = await api.get('/panico-app/stats');
      return data.data as PanicoStats;
    },
    refetchInterval: 30_000,
  });
}

// ── Vecinos App ───────────────────────────────────────────────────────────────

export interface VecinoApp {
  id: number;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  estado: 'ACTIVO' | 'BLOQUEADO' | 'SUSPENDIDO';
  contadorFalsas: number;
  ultimaAlerta: string | null;
  createdAt: string;
}

export interface BloqueHistorial {
  id: number;
  userId: number;
  motivo: string;
  tipo: string;
  operadorRef: string;
  createdAt: string;
}

export interface DesbloquearVars {
  usuarioId: number;
  operadorRef?: string;
}

export function useVecinosApp() {
  return useQuery({
    queryKey: ['panico', 'vecinos'],
    queryFn: async () => {
      const { data } = await api.get('/panico-app/usuarios');
      return data.data as VecinoApp[];
    },
  });
}

export function useBloqueoHistorial(usuarioId: number | null) {
  return useQuery({
    queryKey: ['panico', 'vecinos', usuarioId, 'bloqueos'],
    queryFn: async () => {
      const { data } = await api.get(`/panico-app/usuarios/${usuarioId}/bloqueos`);
      return data.data as BloqueHistorial[];
    },
    enabled: usuarioId !== null,
  });
}

export function useDesbloquearUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: DesbloquearVars) => {
      const { data } = await api.patch(`/panico-app/usuarios/${vars.usuarioId}/desbloquear`, {
        operadorRef: vars.operadorRef ?? 'cecom-operador',
      });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['panico', 'vecinos'] }),
  });
}

// ── Crear Incidencia Manual ───────────────────────────────────────────────────

export interface CrearIncidenciaVars {
  panicAlertId: number;
  tipoCasoId: number;
  subTipoCasoId?: number;
  operadorId?: number;
}

export function useCrearIncidencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: CrearIncidenciaVars) => {
      const { data } = await api.post(`/panico-app/alertas/${vars.panicAlertId}/incidencia`, {
        tipoCasoId:   vars.tipoCasoId,
        subTipoCasoId: vars.subTipoCasoId,
        operadorId:   vars.operadorId,
      });
      return data.data as { incidenciaId: number; codigoIncidencia: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['panico', 'alertas'] }),
  });
}

// ── Catálogos (tipo de caso) ──────────────────────────────────────────────────

export interface TipoCaso {
  id: number;
  codigo: string;
  descripcion: string;
}

export interface SubTipoCaso {
  id: number;
  codigo: string;
  descripcion: string;
  tipoCasoId: number;
}

export function useTipoCasos() {
  return useQuery({
    queryKey: ['catalogos', 'tipoCasos'],
    queryFn: async () => {
      const { data } = await api.get('/catalogos/tipo-casos');
      return data.data as TipoCaso[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useSubTipoCasos(tipoCasoId?: number) {
  return useQuery({
    queryKey: ['catalogos', 'subTipoCasos', tipoCasoId],
    queryFn: async () => {
      const params = tipoCasoId ? { tipoCasoId } : {};
      const { data } = await api.get('/catalogos/sub-tipo-casos', { params });
      return data.data as SubTipoCaso[];
    },
    enabled: tipoCasoId !== undefined,
    staleTime: 5 * 60_000,
  });
}
