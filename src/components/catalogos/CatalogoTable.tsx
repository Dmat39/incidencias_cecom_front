'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { CatalogoItem } from '@/hooks/useCatalogos';
import toast from 'react-hot-toast';

interface Props {
  items: CatalogoItem[];
  isLoading: boolean;
  onCreate: (data: { descripcion: string }) => Promise<unknown>;
  onUpdate: (data: { id: number; descripcion: string }) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
}

export default function CatalogoTable({ items, isLoading, onCreate, onUpdate, onDelete }: Props) {
  const [open, setOpen]           = useState(false);
  const [editing, setEditing]     = useState<CatalogoItem | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [search, setSearch]       = useState('');

  const filtered = search.trim()
    ? items.filter((item) =>
        (item.descripcion || item.nombre || '').toLowerCase().includes(search.toLowerCase())
      )
    : items;

  function openCreate() {
    setEditing(null);
    setDescripcion('');
    setOpen(true);
  }

  function openEdit(item: CatalogoItem) {
    setEditing(item);
    setDescripcion(item.descripcion || item.nombre || '');
    setOpen(true);
  }

  async function handleSubmit() {
    if (!descripcion.trim()) return;
    try {
      if (editing) {
        await onUpdate({ id: editing.id, descripcion });
        toast.success('Actualizado correctamente');
      } else {
        await onCreate({ descripcion });
        toast.success('Creado correctamente');
      }
      setOpen(false);
    } catch {
      toast.error('Error al guardar');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await onDelete(id);
      toast.success('Eliminado');
    } catch {
      toast.error('No se pudo eliminar');
    }
  }

  return (
    <div className="space-y-3">

      {/* Barra superior */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por descripción..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openCreate} size="sm" className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg shadow-sm flex flex-col">
        <div className="overflow-x-auto rounded-t-lg">
          <div className="overflow-y-auto" style={{ height: 'calc(100vh - 320px)' }}>
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-green-600 hover:bg-green-600">
                  {[
                    { label: 'ID',          cls: 'min-w-[60px]'  },
                    { label: 'Descripción', cls: 'min-w-[260px]' },
                    { label: 'Estado',      cls: 'min-w-[90px]'  },
                    { label: 'Acciones',    cls: 'min-w-[90px]'  },
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
                    <TableRow key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {[1, 2, 3, 4].map((j) => (
                        <TableCell key={j}><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-gray-400 text-sm">
                      {search ? 'No hay resultados para la búsqueda.' : 'Sin registros.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item, idx) => (
                    <TableRow
                      key={item.id}
                      className={`transition-colors hover:bg-green-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}
                    >
                      <TableCell className="py-2.5 text-sm text-gray-500">{item.id}</TableCell>
                      <TableCell className="py-2.5 text-sm text-gray-800 font-medium">
                        {item.descripcion || item.nombre || '-'}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.habilitado !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {item.habilitado !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            title="Editar"
                            onClick={() => openEdit(item)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            title="Eliminar"
                            onClick={() => handleDelete(item.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Nuevo registro'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="desc">Descripción</Label>
            <Input
              id="desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ingresa la descripción..."
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
              {editing ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
