'use client';

import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Option {
  id: number;
  label: string;
}

interface Group {
  label: string;
  options: Option[];
}

interface Props {
  options?: Option[];
  groups?: Group[];           // cuando se pasa groups, ignora options
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  singularLabel?: string;
  pluralLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelectFilter({
  options = [],
  groups,
  selected,
  onChange,
  placeholder = 'Todos',
  singularLabel = 'seleccionado',
  pluralLabel = 'seleccionados',
  className,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const allOptions: Option[] = groups ? groups.flatMap((g) => g.options) : options;

  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  const triggerLabel = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) return allOptions.find((o) => o.id === selected[0])?.label ?? placeholder;
    return `${selected.length} ${pluralLabel}`;
  };

  const matchSearch = (o: Option) =>
    o.label.toLowerCase().includes(search.toLowerCase());

  const renderOption = (opt: Option) => {
    const isSelected = selected.includes(opt.id);
    return (
      <button
        key={opt.id}
        type="button"
        title={opt.label}
        onClick={() => toggle(opt.id)}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors',
          'hover:bg-gray-50 dark:hover:bg-gray-700/50',
          isSelected && 'text-green-700 dark:text-green-400'
        )}
      >
        <span className={cn(
          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
          isSelected
            ? 'border-green-500 bg-green-500 text-white'
            : 'border-gray-300 dark:border-gray-600'
        )}>
          {isSelected && <Check className="h-2.5 w-2.5" />}
        </span>
        <span className="truncate">{opt.label}</span>
      </button>
    );
  };

  const hasResults = groups
    ? groups.some((g) => g.options.some(matchSearch))
    : options.some(matchSearch);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
          'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200',
          'hover:border-green-500 hover:text-green-700 dark:hover:border-green-500 dark:hover:text-green-400',
          selected.length > 0 && 'border-green-500 text-green-700 dark:border-green-500 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
          open && 'ring-2 ring-green-500/30',
          'focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
      >
        <span className="max-w-[140px] truncate">{triggerLabel()}</span>
        {selected.length > 0 ? (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onChange([]); setOpen(false); }}
            className="ml-0.5 rounded-full hover:bg-green-200 dark:hover:bg-green-800 p-0.5"
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
        )}
      </PopoverTrigger>

      <PopoverContent className="w-60 p-0" align="start" side="bottom">
        {/* Búsqueda */}
        <div className="px-2 py-1.5 border-b border-gray-100 dark:border-gray-700">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full text-xs bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
          />
        </div>

        {/* Opciones */}
        <div className="max-h-60 overflow-y-auto py-1">
          {!hasResults ? (
            <p className="text-center text-xs text-gray-400 py-3">Sin resultados</p>
          ) : groups ? (
            groups.map((group) => {
              const visible = group.options.filter(matchSearch);
              if (visible.length === 0) return null;
              return (
                <div key={group.label}>
                  <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {group.label}
                  </p>
                  {visible.map(renderOption)}
                </div>
              );
            })
          ) : (
            options.filter(matchSearch).map(renderOption)
          )}
        </div>

        {/* Footer */}
        {selected.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-1.5 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {selected.length} {selected.length === 1 ? singularLabel : pluralLabel}
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-red-500 hover:text-red-600 font-medium"
            >
              Limpiar
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
