'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogoItem | null>(null);
  const [descripcion, setDescripcion] = useState('');

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
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={openCreate} size="sm" className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-green-600 hover:bg-green-600">
              <TableHead className="text-white font-semibold">ID</TableHead>
              <TableHead className="text-white font-semibold">Descripción</TableHead>
              <TableHead className="text-white font-semibold">Estado</TableHead>
              <TableHead className="text-white font-semibold text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">Cargando...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">Sin registros</TableCell></TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50">
                  <TableCell className="text-gray-500 text-sm">{item.id}</TableCell>
                  <TableCell className="font-medium text-gray-800">{item.descripcion || item.nombre || '-'}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.habilitado !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.habilitado !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
