'use client';

import { AlertTriangle, Pencil, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { TIPO_MOTOS_LABEL, siNoLabel } from '@/components/incidencias/ApoyoIncidenciaFields';
import type { TipoMotos } from '@/types';

export interface ResumenIncidencia {
  medio?: string;
  /** Prefijo del código que generará el medio (codigo del catálogo) */
  prefijoCodigo?: string;
  operador?: string;
  apoyoConvenio?: boolean;
  participacionMotorizados?: boolean;
  tipoMotos?: TipoMotos;
  clasificacion?: string;
  reportante?: string;
  direccion?: string;
  jurisdiccion?: string;
  evidencias: number;
}

function Fila({ label, value, destacado }: { label: string; value?: string; destacado?: boolean }) {
  return (
    <div className="flex gap-3 text-sm py-1">
      <span className="w-32 shrink-0 text-gray-500 dark:text-gray-400">{label}</span>
      <span className={destacado ? 'font-semibold text-gray-900 dark:text-gray-50' : 'text-gray-800 dark:text-gray-200'}>
        {value || <span className="italic text-gray-400">Sin datos</span>}
      </span>
    </div>
  );
}

/**
 * Resumen previo al registro. Medio y apoyo recibido van arriba y resaltados:
 * son los campos donde más se equivocan los operadores, y el medio no se
 * puede corregir después porque fija el prefijo del código.
 */
export default function ConfirmarIncidenciaDialog({
  open,
  onOpenChange,
  resumen,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumen: ResumenIncidencia | null;
  onConfirm: () => void;
  loading?: boolean;
}) {
  if (!resumen) return null;

  const motorizados = resumen.participacionMotorizados && resumen.tipoMotos
    ? `Sí — ${TIPO_MOTOS_LABEL[resumen.tipoMotos]}`
    : siNoLabel(resumen.participacionMotorizados);

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="max-w-xl bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>Confirmar registro</DialogTitle>
          <DialogDescription>Revise los datos antes de registrar la incidencia.</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Verifique con atención
          </p>
          <div>
            <Fila label="Medio" value={resumen.medio} destacado />
            {resumen.prefijoCodigo && (
              <p className="text-xs text-amber-700 dark:text-amber-400 pl-[8.75rem]">
                El código saldrá como <strong>{resumen.prefijoCodigo}-…</strong> y no se podrá cambiar después.
              </p>
            )}
            <Fila label="Operador" value={resumen.operador} destacado />
          </div>
          <div className="border-t border-amber-200 dark:border-amber-800 pt-2">
            <Fila label="Apoyo convenio" value={siNoLabel(resumen.apoyoConvenio)} destacado />
            <Fila label="Motorizados" value={motorizados} destacado />
          </div>
        </div>

        <div className="px-1">
          <Fila label="Clasificación" value={resumen.clasificacion} />
          <Fila label="Reportante" value={resumen.reportante} />
          <Fila label="Dirección" value={resumen.direccion} />
          <Fila label="Jurisdicción" value={resumen.jurisdiccion} />
          <Fila
            label="Evidencias"
            value={resumen.evidencias ? `${resumen.evidencias} archivo(s)` : 'Ninguna'}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Corregir
          </Button>
          <Button
            type="button"
            autoFocus
            className="bg-green-600 hover:bg-green-700 min-w-44"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Registrando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Confirmar y registrar
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
