import axios from 'axios';

let sviToken: string | null = null;

export const setSviToken = (token: string | null) => { sviToken = token; };
export const getSviToken = () => sviToken;
export const clearSviToken = () => { sviToken = null; };

const apiSvi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SVI_API_URL || 'http://localhost:3008/api',
  timeout: 60000,
});

apiSvi.interceptors.request.use(
  (config) => {
    if (sviToken) config.headers.Authorization = `Bearer ${sviToken}`;
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
