'use client';

import { Bike, Handshake } from 'lucide-react';
import { Label } from '@/components/ui/label';
import type { TipoMotos } from '@/types';

export const TIPO_MOTOS_LABEL: Record<TipoMotos, string> = {
  ANTIGUAS: 'Motos antiguas',
  NUEVAS:   'Motos nuevas (donadas por Lima)',
  AMBAS:    'Ambas',
};

export function siNoLabel(v?: boolean | null): string | undefined {
  if (v == null) return undefined;
  return v ? 'Sí' : 'No';
}

export interface ApoyoValues {
  apoyoConvenio?: boolean;
  participacionMotorizados?: boolean;
  tipoMotos?: TipoMotos;
}

interface OpcionProps<T> {
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  invalid?: boolean;
}

/** Control segmentado: opciones unidas, la activa en verde (color del sistema). */
function Opciones<T extends string | boolean>({ value, options, onChange, invalid }: OpcionProps<T>) {
  return (
    <div
      role="radiogroup"
      className={`inline-flex flex-wrap rounded-md border overflow-hidden ${
        invalid ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
      }`}
    >
      {options.map((o, i) => {
        const activo = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(o.value)}
            className={`h-9 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500 ${
              i > 0 ? 'border-l border-gray-300 dark:border-gray-600' : ''
            } ${
              activo
                ? 'bg-green-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const SI_NO = [
  { value: true,  label: 'Sí' },
  { value: false, label: 'No' },
];

const MOTOS = (Object.keys(TIPO_MOTOS_LABEL) as TipoMotos[]).map((k) => ({ value: k, label: TIPO_MOTOS_LABEL[k] }));

/**
 * Preguntas de apoyo recibido en la incidencia: convenio y motorizados (Hermes).
 * El tipo de motos solo se pregunta cuando participaron motorizados; al marcar
 * "No" se limpia.
 */
export default function ApoyoIncidenciaFields({
  value,
  onChange,
  errorTipoMotos,
}: {
  value: ApoyoValues;
  onChange: (v: ApoyoValues) => void;
  errorTipoMotos?: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label className="text-sm text-gray-600 dark:text-gray-400">
          <Handshake className="h-3.5 w-3.5 text-gray-400" />
          ¿Tuvo apoyo de convenio?
        </Label>
        <Opciones
          value={value.apoyoConvenio}
          options={SI_NO}
          onChange={(v) => onChange({ ...value, apoyoConvenio: v })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm text-gray-600 dark:text-gray-400">
          <Bike className="h-3.5 w-3.5 text-gray-400" />
          ¿Participaron motorizados (Hermes)?
        </Label>
        <Opciones
          value={value.participacionMotorizados}
          options={SI_NO}
          onChange={(v) => onChange({
            ...value,
            participacionMotorizados: v,
            tipoMotos: v ? value.tipoMotos : undefined,
          })}
        />
      </div>
      {value.participacionMotorizados && (
        <div className="sm:col-span-2 space-y-1.5 rounded-md border-l-2 border-green-500 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
          <Label className="text-sm text-gray-600 dark:text-gray-400">
            ¿Qué motos participaron? <span className="text-red-500">*</span>
          </Label>
          <Opciones
            value={value.tipoMotos}
            options={MOTOS}
            onChange={(v) => onChange({ ...value, tipoMotos: v })}
            invalid={!!errorTipoMotos}
          />
          {errorTipoMotos && <p className="text-xs text-red-500">{errorTipoMotos}</p>}
        </div>
      )}
    </div>
  );
}
