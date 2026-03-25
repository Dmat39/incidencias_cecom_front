import axios from 'axios';

let sviToken: string | null = null;

if (typeof window !== 'undefined') {
  sviToken = localStorage.getItem('svi_token');
}

export const setSviToken = (token: string | null) => {
  sviToken = token;
  if (typeof window !== 'undefined') {
    token
      ? localStorage.setItem('svi_token', token)
      : localStorage.removeItem('svi_token');
  }
};

export const getSviToken = () => sviToken;

export const clearSviToken = () => {
  sviToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('svi_token');
  }
};

const apiSvi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SVI_API_URL || 'http://localhost:3008/api',
  timeout: 60000,
});

apiSvi.interceptors.request.use(
  (config) => {
    // Leer siempre el token más reciente (por si se actualizó después de montar)
    const token = sviToken ?? (typeof window !== 'undefined' ? localStorage.getItem('svi_token') : null);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

apiSvi.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401) clearSviToken();
    return Promise.reject(error);
  },
);

export default apiSvi;