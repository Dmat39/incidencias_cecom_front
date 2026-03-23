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

export function useGestionate() {
  const [personal, setPersonal]   = useState<PersonalGestionate | null>(null);
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState<string | null>(null);

  const buscarPorDni = useCallback(async (dni: string) => {
    if (dni.length !== 8) return;
    setLoading(true);
    setError(null);
    setPersonal(null);
    try {
      const { data } = await api.get<{ data: PersonalGestionate }>(`/gestionate/personal/${dni}`);
      setPersonal(data.data);
    } catch {
      setError('No se encontró personal con ese DNI en Gestionate');
    } finally {
      setLoading(false);
    }
  }, []);

  const limpiar = useCallback(() => {
    setPersonal(null);
    setError(null);
  }, []);

  return { personal, loading, error, buscarPorDni, limpiar };
}
