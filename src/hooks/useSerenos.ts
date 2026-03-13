import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Sereno, CreateSerenoDto, ApiResponse, PaginatedResponse } from '@/types';

const KEYS = {
  all: ['serenos'] as const,
  list: () => ['serenos', 'list'] as const,
  active: () => ['serenos', 'active'] as const,
};

export interface SerenosParams {
  search?: string;
  page?: number;
  limit?: number;
  habilitado?: boolean;
  enabled?: boolean;
}

export function useSerenos(params: SerenosParams = {}) {
  const { search, page = 1, limit = 20, habilitado, enabled = true } = params;
  return useQuery({
    queryKey: [...KEYS.list(), search, page, limit, habilitado],
    enabled,
    queryFn: async () => {
      const qp: Record<string, unknown> = { page, limit };
      if (search) qp.search = search;
      if (habilitado !== undefined) qp.habilitado = habilitado;
      const { data } = await api.get<ApiResponse<PaginatedResponse<Sereno>>>('/serenos', { params: qp });
      return data.data;
    },
  });
}

export function useSerenosActivos() {
  return useQuery({
    queryKey: KEYS.active(),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Sereno>>>('/serenos', {
        params: { habilitado: true, limit: 9999 },
      });
      return (data.data?.data ?? []).filter((s: Sereno) => s.habilitado);
    },
  });
}

export function useCreateSereno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSerenoDto) => {
      const { data } = await api.post<ApiResponse<Sereno>>('/serenos', dto);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateSereno(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<CreateSerenoDto>) => {
      const { data } = await api.patch<ApiResponse<Sereno>>(`/serenos/${id}`, dto);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useToggleSereno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<ApiResponse<Sereno>>(`/serenos/${id}/estado`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDeleteSereno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/serenos/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
