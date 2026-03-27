'use client';

import { useState, useEffect } from 'react';
import { useSerenos, useCreateSereno, useUpdateSereno, useToggleSereno } from '@/hooks/useSerenos';
import { useCargoSerenos } from '@/hooks/useCatalogos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus, Pencil, ToggleLeft, ToggleRight, Search,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Sereno, CreateSerenoDto } from '@/types';

const PAGE_SIZES = [10, 20, 50, 100];

const EMPTY_FORM: CreateSerenoDto = {
  dni: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', habilitado: true, cargoSerenoId: undefined,
};

export default function SerenosPage() {
  const [search, setSearch]           = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [page, setPage]               = useState(1);
  const [limit, setLimit]             = useState(20);
  const [open, setOpen]               = useState(false);
  const [editing, setEditing]         = useState<Sereno | null>(null);
  const [form, setForm]               = useState<CreateSerenoDto>(EMPTY_FORM);

  // Debounce búsqueda → resetea a página 1
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: paginado, isLoading } = useSerenos({ search: debouncedSearch || undefined, page, limit });
  const serenos     = paginado?.data ?? [];
  const total       = paginado?.meta?.total      ?? 0;
  const totalPages  = paginado?.meta?.totalPages ?? 1;
  const startRow    = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRow      = Math.min(page * limit, total);

  const { data: cargos } = useCargoSerenos();
  const createMutation   = useCreateSereno();
  const updateMutation   = useUpdateSereno(editing?.id || 0);
  const toggleMutation   = useToggleSereno();

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setOpen(true); }
  function openEdit(s: Sereno) {
    setEditing(s);
    setForm({
      dni: s.dni || '', nombres: s.nombres || '',
      apellidoPaterno: s.apellidoPaterno || '', apellidoMaterno: s.apellidoMaterno || '',
      habilitado: s.habilitado ?? true, cargoSerenoId: s.cargoSerenoId,
    });
    setOpen(true);
  }

  async function handleSubmit() {
    try {
      if (editing) { await updateMutation.mutateAsync(form); toast.success('Sereno actualizado'); }
      else         { await createMutation.mutateAsync(form);  toast.success('Sereno registrado'); }
      setOpen(false);
    } catch { toast.error('Error al guardar'); }
  }

  async function handleToggle(id: number) {
    try { await toggleMutation.mutateAsync(id); toast.success('Estado actualizado'); }
    catch { toast.error('Error al actualizar'); }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-3">

      {/* ── Encabezado ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Serenos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestión del personal de serenazgo</p>
        </div>
        <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-1.5" /> Nuevo sereno
        </Button>
      </div>

      {/* ── Búsqueda ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o DNI..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col dark:bg-gray-900">
        <div className="overflow-x-auto rounded-t-lg">
          <div className="overflow-y-auto min-w-[700px]" style={{ height: 'calc(100vh - 260px)' }}>
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-green-600 hover:bg-green-600">
                  {[
                    { label: 'DNI',             cls: 'min-w-[110px]' },
                    { label: 'Nombre completo', cls: 'min-w-[240px]' },
                    { label: 'Cargo',           cls: 'min-w-[140px]' },
                    { label: 'Estado',          cls: 'min-w-[100px]' },
                    { label: 'Acciones',        cls: 'min-w-[90px]'  },
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
                      {[1, 2, 3, 4, 5].map((j) => (
                        <TableCell key={j}><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : serenos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                      {search ? 'No hay resultados para la búsqueda.' : 'No hay datos disponibles.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  serenos.map((s: Sereno, idx: number) => (
                    <TableRow
                      key={s.id}
                      className={`transition-colors hover:bg-green-50 dark:hover:bg-green-900/15 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/60 dark:bg-gray-800/40'}`}
                    >
                      <TableCell className="py-2.5 font-mono text-sm text-gray-700 dark:text-gray-300">{s.dni || '-'}</TableCell>
                      <TableCell className="py-2.5 text-sm text-gray-800 dark:text-gray-100">
                        {[s.apellidoPaterno, s.apellidoMaterno, s.nombres].filter(Boolean).join(' ') || '-'}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-gray-600 dark:text-gray-400">{s.cargoSereno?.descripcion || '-'}</TableCell>
                      <TableCell className="py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.habilitado ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400'}`}>
                          {s.habilitado ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            title="Editar"
                            onClick={() => openEdit(s)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            title={s.habilitado ? 'Deshabilitar' : 'Habilitar'}
                            onClick={() => handleToggle(s.id)}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded transition-colors ${s.habilitado ? 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                          >
                            {s.habilitado ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── Paginación ── */}
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

      {/* ── Modal crear/editar ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Sereno' : 'Nuevo Sereno'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>DNI</Label>
              <Input value={form.dni || ''} onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))} placeholder="8 dígitos" />
            </div>
            <div className="space-y-1">
              <Label>Nombres</Label>
              <Input value={form.nombres || ''} onChange={(e) => setForm((f) => ({ ...f, nombres: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Apellido Paterno</Label>
                <Input value={form.apellidoPaterno || ''} onChange={(e) => setForm((f) => ({ ...f, apellidoPaterno: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Apellido Materno</Label>
                <Input value={form.apellidoMaterno || ''} onChange={(e) => setForm((f) => ({ ...f, apellidoMaterno: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Cargo</Label>
              <Select
                value={form.cargoSerenoId ? String(form.cargoSerenoId) : undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, cargoSerenoId: Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecciona cargo" /></SelectTrigger>
                <SelectContent>
                  {cargos?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.descripcion}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving ? 'Guardando...' : editing ? 'Actualizar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
