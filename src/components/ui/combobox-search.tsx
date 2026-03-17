'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface Option {
  value: number;
  label: string;
}

interface ComboboxSearchProps {
  options: Option[];
  value?: number;
  onChange: (value: number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ComboboxSearch({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  disabled = false,
  className,
}: ComboboxSearchProps) {
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
            type="button"
            disabled={disabled}
            style={{ maxWidth: '100%', width: '100%' }}
            className={cn(
                'flex h-9 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
                'focus:outline-none focus:ring-0',
                'disabled:cursor-not-allowed disabled:opacity-50',
                !selected && 'text-muted-foreground',
                className
            )}
            >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, marginRight: '8px' }}>
                {selected ? selected.label : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-9 text-sm focus:ring-0 focus:outline-none border-0"
          />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-sm text-gray-400">
              Sin resultados
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="text-sm">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}