'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus, Pencil, Eye, EyeOff, Loader2, Search,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MapPin, Settings2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Usuario, CreateUsuarioDto, Sereno, Jurisdiccion } from '@/types';

const ROLES = ['admin', 'validador', 'operador', 'supervisor'];
const PAGE_SIZES = [10, 20, 50, 100];

const MODULOS: { key: string; label: string }[] = [
  { key: 'dashboard',   label: 'Dashboard'   },
  { key: 'incidencias', label: 'Incidencias' },
  { key: 'mapa',        label: 'Mapa'        },
  { key: 'serenos',     label: 'Serenos'     },
  { key: 'usuarios',    label: 'Usuarios'    },
  { key: 'catalogos',   label: 'Catálogos'   },
  { key: 'reportes',    label: 'Reportes'    },
  { key: 'metricas',    label: 'Métricas'    },
  { key: 'auditoria',   label: 'Auditoría'   },
  { key: 'alertas',     label: 'Alertas SJL' },
  { key: 'svi',         label: 'SVI'         },
];

function useJurisdicciones() {
  return useQuery<Jurisdiccion[]>({
    queryKey: ['catalogos', 'jurisdicciones'],
    queryFn: async () => {
      const { data } = await api.get('/catalogos/jurisdicciones');
      return data.data ?? data;
    },
    staleTime: 5 * 60_000,
  });
}

function useRoles() {
  return useQuery<any[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get('/roles');
      return data.data ?? data;
    },
    staleTime: 30_000,
  });
}

function usePermisos() {
  return useQuery<any[]>({
    queryKey: ['roles', 'permisos'],
    queryFn: async () => {
      const { data } = await api.get('/roles/permisos');
      return data.data ?? data;
    },
    staleTime: 5 * 60_000,
  });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// ── helpers ──────────────────────────────────────────────────────────────────
const normalize = (str: string) =>
  (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

const generateUsername = (nombres: string, apellidoPaterno: string, apellidoMaterno: string) => {
  const first = normalize(nombres).split(' ')[0];
  const pat   = normalize(apellidoPaterno).split(' ')[0];
  const mat   = normalize(apellidoMaterno).charAt(0);
  return `${first}.${pat}.${mat}`;
};

const generatePassword = (nombres: string, apellidoPaterno: string) => {
  const pat   = normalize(apellidoPaterno).split(' ')[0];
  const first = normalize(nombres).split(' ')[0];
  const digits = Math.floor(1000 + Math.random() * 9000);
  const cap = pat.charAt(0).toUpperCase() + pat.slice(1);
  return `${cap}${first}${digits}#`;
};

const generateEmail = (nombres: string, apellidoPaterno: string) => {
  const pat   = normalize(apellidoPaterno).split(' ')[0];
  const first = normalize(nombres).split(' ')[0];
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${pat}${first}${digits}@munisjl.gob.pe`;
};
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY: CreateUsuarioDto = { username: '', email: '', password: '', nombres: '', apellidos: '', roles: [] };

export default function UsuariosPage() {
  const qc = useQueryClient();

  const [search, setSearch]             = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [page, setPage]                 = useState(1);
  const [limit, setLimit]               = useState(20);

  const [open, setOpen]           = useState(false);
  const [editing, setEditing]     = useState<Usuario | null>(null);
  const [form, setForm]           = useState<CreateUsuarioDto>(EMPTY);
  const [jurIds, setJurIds]       = useState<number[]>([]);

  // Modal configurar módulos por rol
  const [rolesOpen, setRolesOpen]               = useState(false);
  const [selectedRolId, setSelectedRolId]       = useState<number | null>(null);
  const [rolModulosEdit, setRolModulosEdit]      = useState<number[]>([]);

  const { data: jurisdicciones = [] } = useJurisdicciones();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: permisos = [] } = usePermisos();

  // DNI lookup state (solo para creación)
  const [dni, setDni]               = useState('');
  const [dniError, setDniError]     = useState('');
  const [searching, setSearching]   = useState(false);
  const [sereno, setSereno]         = useState<Sereno | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Debounce búsqueda → resetea a página 1
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: paginado, isLoading } = useQuery({
    queryKey: ['usuarios', debouncedSearch, page, limit],
    queryFn: async () => {
      const { data } = await api.get('/usuarios', {
        params: { search: debouncedSearch || undefined, page, limit },
      });
      return data.data;
    },
  });

  const usuarios    = paginado?.data    ?? [];
  const total       = paginado?.meta?.total      ?? 0;
  const totalPages  = paginado?.meta?.totalPages ?? 1;
  const startRow    = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRow      = Math.min(page * limit, total);

  // ── mutations ───────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (dto: CreateUsuarioDto) => {
      const { data } = await api.post('/usuarios', dto);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...dto }: { id: number } & Partial<CreateUsuarioDto>) => {
      const { data } = await api.patch(`/usuarios/${id}`, dto);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });

  const jurMutation = useMutation({
    mutationFn: async ({ id, ids }: { id: number; ids: number[] }) => {
      await api.patch(`/usuarios/${id}/jurisdicciones`, { jurisdiccionIds: ids });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });

  const rolPermisosMutation = useMutation({
    mutationFn: async ({ rolId, permisoIds }: { rolId: number; permisoIds: number[] }) => {
      const { data } = await api.patch(`/roles/${rolId}/permisos`, { permisoIds });
      return data.data ?? data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending || jurMutation.isPending;

  // ── handlers ────────────────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setDni('');
    setDniError('');
    setSereno(null);
    setShowPassword(false);
    setOpen(true);
  }

  function openEdit(u: Usuario) {
    setEditing(u);
    setForm({
      username:  u.username  || '',
      email:     u.email     || '',
      password:  '',
      nombres:   u.nombres   || '',
      apellidos: u.apellidos || '',
      roles: u.roles?.map((r) => r.rol.nombre).filter(Boolean) || [],
    });
    setJurIds((u as any).jurisdiccionesAsignadas?.map((j: any) => j.jurisdiccionId ?? j.id ?? j) ?? []);
    setDni('');
    setDniError('');
    setSereno(null);
    setOpen(true);
  }

  function toggleRole(role: string) {
    setForm((f) => ({
      ...f,
      roles: f.roles?.includes(role)
        ? f.roles.filter((r: string) => r !== role)
        : [...(f.roles || []), role],
    }));
  }

  async function handleDniSearch() {
    if (dni.length !== 8) return;
    setSearching(true);
    setDniError('');
    setSereno(null);
    try {
      const { data } = await axios.get(`${API_URL}/serenos/buscar-dni/${dni}`);
      if (data.success && data.data) {
        const s: Sereno = data.data;
        setSereno(s);
        const username = generateUsername(s.nombres || '', s.apellidoPaterno || '', s.apellidoMaterno || '');
        const password = generatePassword(s.nombres || '', s.apellidoPaterno || '');
        const email    = generateEmail(s.nombres || '', s.apellidoPaterno || '');
        setForm({
          username,
          email,
          password,
          nombres:   s.nombres || '',
          apellidos: `${s.apellidoPaterno || ''} ${s.apellidoMaterno || ''}`.trim(),
          roles: [],
        });
      } else {
        setDniError('DNI no registrado en serenos');
      }
    } catch {
      setDniError('DNI no registrado en serenos');
    } finally {
      setSearching(false);
    }
  }

  function handleDniChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
    setDni(value);
    if (sereno || dniError) {
      setSereno(null);
      setDniError('');
      setForm(EMPTY);
    }
  }

  async function handleSubmit() {
    try {
      if (editing) {
        const { password, ...rest } = form;
        await updateMutation.mutateAsync({ id: editing.id, ...rest, ...(password ? { password } : {}) });
        await jurMutation.mutateAsync({ id: editing.id, ids: jurIds });
        toast.success('Usuario actualizado');
      } else {
        await createMutation.mutateAsync(form);
        toast.success('Usuario creado');
      }
      setOpen(false);
    } catch {
      toast.error('Error al guardar');
    }
  }

  function toggleJurisdiccion(id: number) {
    setJurIds((prev) => prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]);
  }

  // ── Roles modal ─────────────────────────────────────────────────────────────
  function openRolesModal() {
    const firstRol = roles[0];
    if (firstRol) {
      setSelectedRolId(firstRol.id);
      const currentPermisoIds = firstRol.permisos?.map((rp: any) => rp.permiso.id) ?? [];
      setRolModulosEdit(currentPermisoIds);
    }
    setRolesOpen(true);
  }

  function selectRol(rol: any) {
    setSelectedRolId(rol.id);
    setRolModulosEdit(rol.permisos?.map((rp: any) => rp.permiso.id) ?? []);
  }

  function toggleRolModulo(permisoId: number) {
    setRolModulosEdit((prev) =>
      prev.includes(permisoId) ? prev.filter((id) => id !== permisoId) : [...prev, permisoId]
    );
  }

  async function saveRolModulos() {
    if (!selectedRolId) return;
    try {
      await rolPermisosMutation.mutateAsync({ rolId: selectedRolId, permisoIds: rolModulosEdit });
      toast.success('Módulos del rol actualizados');
    } catch {
      toast.error('Error al guardar');
    }
  }

  const selectedRol = roles.find((r: any) => r.id === selectedRolId);

  const readonlyInputClass = 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 cursor-default';

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Usuarios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestión de usuarios del sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={openRolesModal}
            className="gap-1.5 text-sm border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-purple-500 hover:text-purple-600"
          >
            <Settings2 className="h-4 w-4" />
            Módulos por rol
          </Button>
          <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-1.5" /> Nuevo usuario
          </Button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, usuario o email..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col dark:bg-gray-900">
        <div className="overflow-x-auto rounded-t-lg">
          <div className="overflow-y-auto min-w-[700px]" style={{ height: 'calc(100vh - 260px)' }}>
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-green-600 hover:bg-green-600">
                  {[
                    { label: 'Usuario',         cls: 'min-w-[130px]' },
                    { label: 'Nombre completo', cls: 'min-w-[200px]' },
                    { label: 'Email',           cls: 'min-w-[200px]' },
                    { label: 'Roles',           cls: 'min-w-[160px]' },
                    { label: 'Jurisdicciones',  cls: 'min-w-[180px]' },
                    { label: 'Estado',          cls: 'min-w-[90px]'  },
                    { label: 'Acciones',        cls: 'min-w-[80px]'  },
                  ].map(({ label, cls }) => (
                    <TableHead key={label} className={`text-white font-semibold text-sm whitespace-nowrap bg-green-600 ${cls}`}>
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/40'}>
                      {[1,2,3,4,5,6,7].map((j) => (
                        <TableCell key={j}><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : usuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
                      {search ? 'No hay resultados para la búsqueda.' : 'Sin usuarios registrados.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  usuarios.map((u: Usuario, idx: number) => (
                    <TableRow
                      key={u.id}
                      className={`transition-colors hover:bg-green-50 dark:hover:bg-green-900/15 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/60 dark:bg-gray-800/40'}`}
                    >
                      <TableCell className="py-2.5 font-medium text-sm text-gray-800 dark:text-gray-100">{u.username}</TableCell>
                      <TableCell className="py-2.5 text-sm text-gray-700 dark:text-gray-200">
                        {[u.nombres, u.apellidos].filter(Boolean).join(' ') || '-'}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={u.email || ''}>
                        {u.email || '-'}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(u.roles || []).map((r) => (
                            <span key={r.rol.nombre} className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                              {r.rol.nombre}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        {(() => {
                          const jurs = (u as any).jurisdiccionesAsignadas ?? [];
                          if (!jurs.length) return <span className="text-xs text-gray-400 dark:text-gray-500 italic">Todas</span>;
                          return (
                            <div className="flex flex-wrap gap-1">
                              {jurs.map((j: any) => (
                                <span key={j.jurisdiccionId} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">
                                  {j.jurisdiccion?.nombre ?? j.jurisdiccionId}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.habilitado !== false ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400'}`}>
                          {u.habilitado !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <button
                          title="Editar"
                          onClick={() => openEdit(u)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Paginación */}
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-end gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Filas por página:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="h-7 text-sm border border-gray-300 dark:border-gray-600 rounded px-1 bg-white dark:bg-gray-800 dark:text-gray-300 focus:outline-none"
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{startRow}–{endRow} de {total}</span>
            <div className="flex items-center gap-0.5">
              <button disabled={page <= 1} onClick={() => setPage(1)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal crear/editar usuario */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 overflow-y-auto flex-1 pr-1">
            {/* Creación: buscar DNI */}
            {!editing && (
              <div className="space-y-1">
                <Label>DNI <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input
                    value={dni}
                    onChange={handleDniChange}
                    onKeyDown={(e) => e.key === 'Enter' && dni.length === 8 && handleDniSearch()}
                    maxLength={8}
                    placeholder="Ingrese 8 dígitos"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleDniSearch}
                    disabled={dni.length !== 8 || searching}
                    className="bg-green-600 hover:bg-green-700 shrink-0"
                  >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                  </Button>
                </div>
                {dniError && <p className="text-xs text-red-500">{dniError}</p>}
                {sereno && <p className="text-xs text-green-600">Sereno encontrado</p>}
              </div>
            )}

            {/* Datos readonly (solo creación) */}
            {!editing && sereno && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Nombres</Label>
                    <Input value={form.nombres || ''} readOnly className={readonlyInputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label>Apellidos</Label>
                    <Input value={form.apellidos || ''} readOnly className={readonlyInputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Usuario generado</Label>
                    <Input value={form.username} readOnly className={readonlyInputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label>Email generado</Label>
                    <Input value={form.email} readOnly className={readonlyInputClass} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Contraseña generada</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      readOnly
                      className={readonlyInputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Campos editables (solo edición) */}
            {editing && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Usuario</Label>
                    <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Nombres</Label>
                    <Input value={form.nombres || ''} onChange={(e) => setForm((f) => ({ ...f, nombres: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Apellidos</Label>
                    <Input value={form.apellidos || ''} onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Nueva contraseña (opcional)</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                </div>
              </>
            )}

            {/* Roles */}
            {(editing || sereno) && (
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        form.roles?.includes(role)
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-400'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Jurisdicciones Alertas SJL — solo en edición */}
            {editing && jurisdicciones.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-gray-500" />
                  Jurisdicciones Alertas SJL
                </Label>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Sin selección = ve todas las alertas
                </p>
                <div className="flex flex-wrap gap-2">
                  {jurisdicciones.map((jur) => (
                    <button
                      key={jur.id}
                      type="button"
                      onClick={() => toggleJurisdiccion(jur.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        jurIds.includes(jur.id)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                      }`}
                    >
                      {jur.nombre || `Jurisdicción ${jur.id}`}
                    </button>
                  ))}
                </div>
                {jurIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setJurIds([])}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
                  >
                    Limpiar selección (ver todas)
                  </button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving || (!editing && !sereno)}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Módulos por rol */}
      <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-purple-600" />
              Módulos por rol
            </DialogTitle>
          </DialogHeader>

          {rolesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="flex gap-4 flex-1 overflow-hidden py-2">
              {/* Lista de roles */}
              <div className="w-36 shrink-0 space-y-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Rol</p>
                {roles.map((rol: any) => (
                  <button
                    key={rol.id}
                    type="button"
                    onClick={() => selectRol(rol)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg font-medium transition-colors ${
                      selectedRolId === rol.id
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    {rol.nombre}
                    <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                      {rol.permisos?.length ?? 0} módulo{rol.permisos?.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                ))}
              </div>

              {/* Módulos del rol seleccionado */}
              <div className="flex-1 overflow-y-auto">
                {selectedRol ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Módulos para <span className="text-purple-600 dark:text-purple-400">{selectedRol.nombre}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {MODULOS.map((m) => {
                        const permiso = permisos.find((p: any) => p.nombre === m.key);
                        if (!permiso) return null;
                        const isActive = rolModulosEdit.includes(permiso.id);
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => toggleRolModulo(permiso.id)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                              isActive
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400'
                            }`}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                      {rolModulosEdit.length} módulo{rolModulosEdit.length !== 1 ? 's' : ''} seleccionado{rolModulosEdit.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">Selecciona un rol</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-gray-100 dark:border-gray-700 pt-3">
            <Button variant="outline" onClick={() => setRolesOpen(false)}>Cerrar</Button>
            <Button
              onClick={saveRolModulos}
              disabled={!selectedRolId || rolPermisosMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            >
              {rolPermisosMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
