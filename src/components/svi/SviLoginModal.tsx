'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useSviAuthStore } from '@/store/sviAuthStore';
import axios from 'axios';

const SVI_API = process.env.NEXT_PUBLIC_SVI_API_URL || 'http://localhost:3008/api';

interface Props {
  open: boolean;
}

export default function SviLoginModal({ open }: Props) {
  const { login } = useSviAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${SVI_API}/auth/user/`, { email, password });
      const token  = data?.token;
      const userId = data?.data?.user_id;
      if (!token || !userId) {
        setError('Respuesta inválida del servidor SVI.');
        return;
      }
      login(token, userId);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Credenciales incorrectas.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-slate-600" />
            <DialogTitle>Acceso al módulo SVI</DialogTitle>
          </div>
          <p className="text-sm text-gray-500 pt-1">
            Este módulo requiere credenciales propias del sistema SVI.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-700 text-sm p-3 rounded">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="svi-email">Correo electrónico</Label>
            <Input
              id="svi-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@munisjl.gob.pe"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="svi-password">Contraseña</Label>
            <Input
              id="svi-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-600 hover:bg-slate-700"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Iniciando sesión...</>
            ) : (
              'Ingresar'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
