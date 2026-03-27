'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { ApiResponse } from '@/types';

const schema = z.object({
  username: z.string().min(1, 'Requerido'),
  password: z.string().min(1, 'Requerido'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  useEffect(() => {
    const saved = localStorage.getItem('cecom_remembered_user');
    if (saved) {
      setValue('username', saved);
      setRememberMe(true);
    }
  }, []);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormData) {
    try {
      if (rememberMe) {
        localStorage.setItem('cecom_remembered_user', values.username);
      } else {
        localStorage.removeItem('cecom_remembered_user');
      }

      const { data } = await api.post<ApiResponse<{
        accessToken: string;
        refreshToken: string;
        usuario: { id: number; username: string; email: string; nombre?: string; roles: string[] };
      }>>('/auth/login', values);

      const { accessToken, refreshToken, usuario } = data.data;
      login(
        { id: usuario.id, username: usuario.username, email: usuario.email, nombres: usuario.nombre, roles: usuario.roles },
        accessToken,
        refreshToken,
      );
      toast.success('¡Bienvenido!');
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Credenciales incorrectas';
      toast.error(msg);
    }
  }

  return (
    <div className="flex items-center justify-center bg-cover bg-center relative min-h-screen bg-gray-50">

      {/* Esquina superior izquierda */}
      <div className="flex absolute top-0 left-0 w-2/4 sm:w-2/5 md:w-60 lg:w-80 aspect-square bg-left-top bg-no-repeat bg-cover drop-shadow"
        style={{ backgroundImage: "url('/fondo_sjl_top.png')" }}
      />

      {/* Esquina inferior derecha */}
      <div className="flex absolute bottom-0 right-0 w-2/4 sm:w-2/5 md:w-60 lg:w-80 aspect-square bg-right-bottom bg-no-repeat bg-cover drop-shadow"
        style={{ backgroundImage: "url('/fondo_sjl_bottom.png')" }}
      />

      {/* Contenido */}
      <div className="flex flex-col items-center justify-center gap-6 w-full mb-20 min-h-[536px] px-4">

        {/* Logo */}
        <Image src="/logo_isa.webp" alt="logo" width={400} height={400} className="z-10 drop-shadow" />

        {/* Título */}
        <h1 className="text-gray-900 text-2xl md:text-3xl font-bold text-center z-10 drop-shadow-lg">
          Bienvenido
        </h1>

        {/* Subtítulo */}
        <p className="text-gray-800 text-base md:text-lg text-center z-10 drop-shadow max-w-md font-semibold">
          Por favor, ingrese sus credenciales para continuar
        </p>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md px-6 z-10">
          <div className="flex flex-col gap-5">

            {/* Usuario */}
            <div className="flex flex-col gap-2">
              <label htmlFor="username" className="text-gray-900 font-bold text-lg drop-shadow-sm">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                placeholder="Ingrese su usuario"
                {...register('username')}
                className={`w-full px-5 py-4 text-lg rounded-lg bg-white border-2 text-gray-900 placeholder-gray-500
                  focus:outline-none focus:ring-4 focus:ring-green-400 focus:border-green-400
                  transition-all shadow-lg
                  ${errors.username ? 'border-red-400' : 'border-gray-300'}`}
                disabled={isSubmitting}
                autoComplete="username"
              />
              {errors.username && <p className="text-xs text-red-500">{errors.username.message}</p>}
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-gray-900 font-bold text-lg drop-shadow-sm">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Ingrese su contraseña"
                  {...register('password')}
                  className={`w-full px-5 py-4 pr-14 text-lg rounded-lg bg-white border-2 text-gray-900 placeholder-gray-500
                    focus:outline-none focus:ring-4 focus:ring-green-400 focus:border-green-400
                    transition-all shadow-lg
                    ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 transition-colors p-1"
                  disabled={isSubmitting}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* Recordar usuario */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-gray-400 text-green-600 focus:ring-4 focus:ring-green-400 cursor-pointer accent-green-600"
                disabled={isSubmitting}
              />
              <label htmlFor="rememberMe" className="text-gray-900 font-semibold text-base drop-shadow-sm cursor-pointer select-none">
                Recordar mi usuario
              </label>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-3 px-6 py-4 text-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                text-white font-bold rounded-lg shadow-xl transition-all duration-200
                transform hover:scale-[1.03] active:scale-[0.97]"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
}
