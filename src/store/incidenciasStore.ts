import { create } from 'zustand';
import type { FilterIncidenciaDto } from '@/types';

type DropdownFilters = Pick<FilterIncidenciaDto, 'situacionId' | 'unidadId' | 'jurisdiccionId' | 'severidadId' | 'tipoCasoId' | 'subTipoCasoId' | 'fechaInicio' | 'fechaFin'>;

interface IncidenciasStore {
  filters: FilterIncidenciaDto;
  pending: DropdownFilters;
  searchText: string;
  showFilters: boolean;
  hasChanges: boolean;
  
  setFilters: (filters: FilterIncidenciaDto | ((prev: FilterIncidenciaDto) => FilterIncidenciaDto)) => void;
  setPending: (pending: DropdownFilters | ((prev: DropdownFilters) => DropdownFilters)) => void;
  setSearchText: (text: string) => void;
  setShowFilters: (show: boolean | ((prev: boolean) => boolean)) => void;
  setHasChanges: (hasChanges: boolean) => void;
}

const EMPTY_PENDING: DropdownFilters = {};

export const useIncidenciasStore = create<IncidenciasStore>((set) => ({
  filters: { page: 1, limit: 20 },
  pending: EMPTY_PENDING,
  searchText: '',
  showFilters: false,
  hasChanges: false,

  setFilters: (filters) => set((state) => ({
    filters: typeof filters === 'function' ? filters(state.filters) : filters,
  })),
  setPending: (pending) => set((state) => ({
    pending: typeof pending === 'function' ? pending(state.pending) : pending,
  })),
  setSearchText: (searchText) => set({ searchText }),
  setShowFilters: (show) => set((state) => ({
    showFilters: typeof show === 'function' ? show(state.showFilters) : show,
  })),
  setHasChanges: (hasChanges) => set({ hasChanges }),
}));
