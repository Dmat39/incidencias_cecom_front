import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Incidencia,
  CreateIncidenciaDto,
  UpdateAtencionDto,
  FilterIncidenciaDto,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

const KEYS = {
  all: ['incidencias'] as const,
  list: (filters: FilterIncidenciaDto) => ['incidencias', 'list', filters] as const,
  detail: (id: number) => ['incidencias', id] as const,
  stats: () => ['incidencias', 'stats'] as const,
};

export function useIncidencias(filters: FilterIncidenciaDto = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
      );
      const { data } = await api.get<ApiResponse<PaginatedResponse<Incidencia>>>('/incidencias', { params });
      return data.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useIncidencia(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Incidencia>>(`/incidencias/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useIncidenciasStats(
  fechaInicio?: string,
  fechaFin?: string,
  tipoCasoIds?: number[],
  subTipoCasoIds?: number[],
) {
  return useQuery({
    queryKey: [...KEYS.stats(), fechaInicio, fechaFin, tipoCasoIds, subTipoCasoIds],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (fechaInicio)              params.fechaInicio   = fechaInicio;
      if (fechaFin)                 params.fechaFin      = fechaFin;
      if (tipoCasoIds?.length)      params.tipoCasoIds   = tipoCasoIds.join(',');
      if (subTipoCasoIds?.length)   params.subTipoCasoIds = subTipoCasoIds.join(',');
      const { data } = await api.get<ApiResponse<any>>('/incidencias/stats', { params });
      return data.data;
    },
  });
}

export function useCreateIncidencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateIncidenciaDto) => {
      const { data } = await api.post<ApiResponse<Incidencia>>('/incidencias', dto);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateIncidencia(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<CreateIncidenciaDto>) => {
      const { data } = await api.patch<ApiResponse<Incidencia>>(`/incidencias/${id}`, dto);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useUpdateAtencion(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateAtencionDto) => {
      const { data } = await api.patch<ApiResponse<Incidencia>>(`/incidencias/${id}/atencion`, dto);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useAssignSerenos(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (serenoIds: number[]) => {
      const { data } = await api.patch<ApiResponse<Incidencia>>(`/incidencias/${id}/serenos`, { serenosIds: serenoIds });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
  });
}

export interface MapaFilters {
  fechaInicio?: string;
  fechaFin?: string;
  turno?: 'mañana' | 'tarde' | 'noche';
}

export function useIncidenciasMapa(filters: MapaFilters = {}) {
  return useQuery({
    queryKey: ['incidencias', 'mapa', filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
      );
      const { data } = await api.get<ApiResponse<Incidencia[]>>('/incidencias/mapa', { params });
      return data.data ?? [];
    },
    staleTime: 30 * 1000,
  });
}

export function useEvidencias(id: number) {
  return useQuery({
    queryKey: ['incidencias', id, 'evidencias'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any[]>>(`/evidencias/incidencia/${id}`);
      return data.data ?? [];
    },
    enabled: !!id,
  });
}

export function useUploadEvidencia(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post(`/incidencias/${id}/evidencias`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: ['incidencias', id, 'evidencias'] });
    },
  });
}
