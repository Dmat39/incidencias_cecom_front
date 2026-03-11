import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse } from '@/types';

type CatalogName =
  | 'unidades'
  | 'tipo-casos'
  | 'subtipo-casos'
  | 'jurisdicciones'
  | 'medios'
  | 'operadores'
  | 'estado-incidencias'
  | 'severidades'
  | 'cargo-serenos'
  | 'tipo-reportantes'
  | 'estado-procesos'
  | 'genero-agresor'
  | 'genero-victima'
  | 'severidad-procesos';

export interface CatalogoItem {
  id: number;
  descripcion?: string;
  nombre?: string;
  codigo?: string;
  urgencia?: string;
  habilitado?: boolean;
  unidadId?: number;
  tipoCasoId?: number;
  medioId?: number;
}

function useCatalogo(name: CatalogName) {
  return useQuery({
    queryKey: ['catalogos', name],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CatalogoItem[]>>(`/catalogos/${name}`);
      return data.data ?? [];
    },
    staleTime: 0,
  });
}

export function useUnidades() { return useCatalogo('unidades'); }
export function useTipoCasos() { return useCatalogo('tipo-casos'); }
export function useSubTipoCasos() { return useCatalogo('subtipo-casos'); }
export function useJurisdicciones() { return useCatalogo('jurisdicciones'); }
export function useMedios() { return useCatalogo('medios'); }
export function useOperadores() { return useCatalogo('operadores'); }
export function useEstadoIncidencias() { return useCatalogo('estado-incidencias'); }
export function useSeveridades() { return useCatalogo('severidades'); }
export function useCargoSerenos() { return useCatalogo('cargo-serenos'); }
export function useTipoReportantes() { return useCatalogo('tipo-reportantes'); }
export function useEstadoProcesos() { return useCatalogo('estado-procesos'); }
export function useGeneroAgresor() { return useCatalogo('genero-agresor'); }
export function useGeneroVictima() { return useCatalogo('genero-victima'); }
export function useSeveridadProcesos() { return useCatalogo('severidad-procesos'); }

// Hooks dinámicos para selects en cascada del formulario de incidencias
export function useTipoCasosByUnidad(unidadId?: number) {
  return useQuery({
    queryKey: ['catalogos', 'tipo-casos', unidadId],
    queryFn: async () => {
      const params = unidadId ? { unidadId } : {};
      const { data } = await api.get<ApiResponse<CatalogoItem[]>>('/catalogos/tipo-casos', { params });
      return data.data ?? [];
    },
    enabled: !!unidadId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubTipoCasosByTipo(tipoCasoId?: number) {
  return useQuery({
    queryKey: ['catalogos', 'subtipo-casos', tipoCasoId],
    queryFn: async () => {
      const params = tipoCasoId ? { tipoCasoId } : {};
      const { data } = await api.get<ApiResponse<CatalogoItem[]>>('/catalogos/subtipo-casos', { params });
      return data.data ?? [];
    },
    enabled: !!tipoCasoId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOperadoresByMedio(medioId?: number) {
  return useQuery({
    queryKey: ['catalogos', 'operadores', medioId],
    queryFn: async () => {
      const params = medioId ? { medioId } : {};
      const { data } = await api.get<ApiResponse<CatalogoItem[]>>('/catalogos/operadores', { params });
      return data.data ?? [];
    },
    enabled: !!medioId,
    staleTime: 5 * 60 * 1000,
  });
}

// Generic CRUD for catalog management
export function useCatalogoMutations(name: CatalogName) {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (dto: { descripcion?: string; nombre?: string; [k: string]: unknown }) => {
      const { data } = await api.post(`/catalogos/${name}`, dto);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalogos', name] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...dto }: { id: number; [k: string]: unknown }) => {
      const { data } = await api.patch(`/catalogos/${name}/${id}`, dto);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalogos', name] }),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/catalogos/${name}/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalogos', name] }),
  });

  return { create, update, remove };
}
