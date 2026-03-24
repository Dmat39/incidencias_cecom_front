import { useState, useCallback } from 'react';
import api from '@/lib/api';

export interface PersonalGestionate {
  id: number;
  dni: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  subgerencia: string;
}

export type FuenteReportante = 'GESTIONATE' | 'LOCAL' | 'MANUAL';

export function useGestionate() {
  const [personal,      setPersonal]      = useState<PersonalGestionate | null>(null);
  const [fuente,        setFuente]        = useState<FuenteReportante | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [notFound,      setNotFound]      = useState(false); // no está en ninguna de las dos
  const [nombreResults, setNombreResults] = useState<PersonalGestionate[]>([]);
  const [nombreLoading, setNombreLoading] = useState(false);

  const buscarPorDni = useCallback(async (dni: string) => {
    if (dni.length !== 8) return;
    setLoading(true);
    setPersonal(null);
    setFuente(null);
    setNotFound(false);

    // 1. Buscar en Gestionate
    try {
      const { data } = await api.get<{ data: PersonalGestionate }>(`/gestionate/personal/${dni}`);
      setPersonal(data.data);
      setFuente('GESTIONATE');
      setLoading(false);
      return;
    } catch { /* no está en gestionate, intentar local */ }

    // 2. Buscar en tabla local de serenos
    try {
      const { data } = await api.get<{ data: PersonalGestionate | null }>(`/gestionate/personal/local/${dni}`);
      if (data.data) {
        setPersonal(data.data);
        setFuente('LOCAL');
        setLoading(false);
        return;
      }
    } catch { /* no está en local tampoco */ }

    // 3. No encontrado en ninguna fuente
    setNotFound(true);
    setLoading(false);
  }, []);

  const buscarPorNombre = useCallback(async (q: string) => {
    if (q.length < 2) { setNombreResults([]); return; }
    setNombreLoading(true);
    try {
      const { data } = await api.get<{ data: PersonalGestionate[] }>(
        `/gestionate/personal/local/buscar-nombre?q=${encodeURIComponent(q)}`
      );
      setNombreResults(data.data ?? []);
    } catch {
      setNombreResults([]);
    } finally {
      setNombreLoading(false);
    }
  }, []);

  const seleccionarPorNombre = useCallback((p: PersonalGestionate) => {
    setPersonal(p);
    setFuente('LOCAL');
    setNotFound(false);
    setNombreResults([]);
  }, []);

  const guardarLocal = useCallback(async (dni: string, nombreCompleto: string) => {
    try {
      await api.post('/gestionate/personal/local', { dni, nombreCompleto });
    } catch { /* silencioso, no bloquea el flujo */ }
  }, []);

  const limpiar = useCallback(() => {
    setPersonal(null);
    setFuente(null);
    setNotFound(false);
    setNombreResults([]);
  }, []);

  return {
    personal, fuente, loading, notFound,
    nombreResults, nombreLoading,
    buscarPorDni, buscarPorNombre, seleccionarPorNombre, guardarLocal, limpiar,
  };
}
