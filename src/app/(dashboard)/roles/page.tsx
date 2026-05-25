'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ShieldCheck, Users, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── tipos ──────────────────────────────────────────────────────────────────────

interface Permiso { id: number; nombre: string; descripcion: string | null }
interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
  permisos: { permiso: Permiso }[];
  _count: { usuarios: number };
}

// ── hooks ──────────────────────────────────────────────────────────────────────

function useRoles() {
  return useQuery<Rol[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get('/roles');
      return data.data ?? data;
    },
  });
}

function usePermisos() {
  return useQuery<Permiso[]>({
    queryKey: ['roles', 'permisos'],
    queryFn: async () => {
      const { data } = await api.get('/roles/permisos');
      return data.data ?? data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── etiquetas legibles ────────────────────────────────────────────────────────

const MODULO_LABEL: Record<string, string> = {
  dashboard:   'Dashboard',
  incidencias: 'Incidencias',
  alertas:     'Alertas SJL',
  mapa:        'Mapa en Vivo',
  serenos:     'Serenos',
  usuarios:    'Usuarios',
  catalogos:   'Catálogos',
  reportes:    'Reportes',
  metricas:    'Métricas',
  auditoria:   'Auditoría',
  svi:         'SVI',
};

const MODULO_COLOR: Record<string, string> = {
  dashboard:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  incidencias: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  alertas:     'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  mapa:        'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
  serenos:     'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  usuarios:    'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  catalogos:   'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  reportes:    'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
  metricas:    'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
  auditoria:   'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300',
  svi:         'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

// ── componente principal ───────────────────────────────────────────────────────

export default function RolesPage() {
  const qc = useQueryClient();

  const { data: roles = [], isLoading } = useRoles();
  const { data: permisos = [] } = usePermisos();

  const [open, setOpen]         = useState(false);
  const [editing, setEditing]   = useState<Rol | null>(null);
  const [nombre, setNombre]     = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [selPermisos, setSelPermisos] = useState<number[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Rol | null>(null);

  // mutations
  const createMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/roles', { nombre, descripcion, permisoIds: selPermisos });
      return data.data ?? data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Rol creado'); setOpen(false); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al crear rol'),
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await api.patch(`/roles/${editing.id}`, { nombre, descripcion });
      await api.patch(`/roles/${editing.id}/permisos`, { permisoIds: selPermisos });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Rol actualizado'); setOpen(false); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => api.delete(`/roles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Rol eliminado'); setDeleteConfirm(null); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'No se puede eliminar'),
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  // handlers
  function openCreate() {
    setEditing(null);
    setNombre('');
    setDescripcion('');
    setSelPermisos([]);
    setOpen(true);
  }

  function openEdit(rol: Rol) {
    setEditing(rol);
    setNombre(rol.nombre);
    setDescripcion(rol.descripcion ?? '');
    setSelPermisos(rol.permisos.map((rp) => rp.permiso.id));
    setOpen(true);
  }

  function togglePermiso(id: number) {
    setSelPermisos((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  }

  function handleSubmit() {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    editing ? updateMut.mutate() : createMut.mutate();
  }

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Roles y Módulos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona los roles y qué módulos puede acceder cada uno</p>
        </div>
        <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-1.5" /> Nuevo rol
        </Button>
      </div>

      {/* Grid de roles */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3 animate-pulse bg-white dark:bg-gray-900">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
              <div className="flex gap-2 flex-wrap">
                {[1,2,3].map((j) => <div key={j} className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((rol) => (
            <div
              key={rol.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header del card */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 capitalize truncate">{rol.nombre}</p>
                    {rol.descripcion && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{rol.descripcion}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(rol)}
                    className="w-7 h-7 flex items-center justify-center rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(rol)}
                    disabled={rol._count.usuarios > 0}
                    className="w-7 h-7 flex items-center justify-center rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={rol._count.usuarios > 0 ? `${rol._count.usuarios} usuario(s) asignados` : 'Eliminar rol'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Módulos */}
              <div className="flex flex-wrap gap-1.5">
                {rol.permisos.length === 0 ? (
                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">Sin módulos asignados</span>
                ) : (
                  rol.permisos.map((rp) => (
                    <span
                      key={rp.permiso.id}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${MODULO_COLOR[rp.permiso.nombre] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {MODULO_LABEL[rp.permiso.nombre] ?? rp.permiso.nombre}
                    </span>
                  ))
                )}
              </div>

              {/* Footer: usuarios asignados */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-800">
                <Users className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {rol._count.usuarios} usuario{rol._count.usuarios !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear / editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar rol: ${editing.nombre}` : 'Nuevo rol'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nombre */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre del rol <span className="text-red-500">*</span></Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="ej: videovigilan"
                />
              </div>
              <div className="space-y-1">
                <Label>Descripción</Label>
                <Input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="ej: Operador de cámaras"
                />
              </div>
            </div>

            {/* Módulos */}
            <div className="space-y-2">
              <Label>Módulos que puede acceder</Label>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Selecciona los módulos del sistema para este rol
              </p>
              <div className="grid grid-cols-2 gap-2">
                {permisos.map((p) => {
                  const activo = selPermisos.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePermiso(p.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium text-left transition-colors ${
                        activo
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-400'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${activo ? 'bg-white' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      {MODULO_LABEL[p.nombre] ?? p.nombre}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {selPermisos.length} de {permisos.length} módulos seleccionados
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving || !nombre.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Guardando...</> : editing ? 'Actualizar' : 'Crear rol'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal confirmar eliminación */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar rol</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            ¿Seguro que deseas eliminar el rol <strong className="text-gray-900 dark:text-gray-100">{deleteConfirm?.nombre}</strong>?
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button
              onClick={() => deleteConfirm && deleteMut.mutate(deleteConfirm.id)}
              disabled={deleteMut.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMut.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
