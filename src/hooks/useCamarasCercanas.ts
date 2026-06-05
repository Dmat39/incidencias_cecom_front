import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const SIVECAM_URL = process.env.NEXT_PUBLIC_SIVECAM_API_URL ?? '';

export interface CamaraCercana {
  id: string;
  tipo: 'municipal' | 'vecinal';
  nombre?: string;
  direccion: string;
  tipoCamara?: 'LPR' | 'C180' | 'C360';
  marca?: 'DAHUA' | 'HIKVISION';
  modo?: 'FIXED' | 'DOME' | 'BOTH';
  latitude: number;
  longitude: number;
  distanciaM: number;
}

export function useCamarasCercanas(
  lat?: number | null,
  lng?: number | null,
  radio = 500,
) {
  return useQuery({
    queryKey: ['camaras-cercanas', lat, lng, radio],
    queryFn: async () => {
      const { data } = await axios.get<CamaraCercana[]>(
        `${SIVECAM_URL}/api/camaras/cercanas`,
        { params: { lat, lng, radio }, timeout: 8000 },
      );
      return data;
    },
    enabled: !!SIVECAM_URL && !!lat && !!lng,
    staleTime: 5 * 60 * 1000,
  });
}
