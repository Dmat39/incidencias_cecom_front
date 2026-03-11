import { cn } from '@/lib/utils';

interface Props {
  estado?: string;
  className?: string;
}

function getEstadoStyle(estado?: string) {
  const lower = (estado || '').toLowerCase();
  if (lower.includes('pendiente')) return 'bg-red-100 text-red-700 border-red-200';
  if (lower.includes('atencion') || lower.includes('atención')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (lower.includes('atendida')) return 'bg-green-100 text-green-700 border-green-200';
  if (lower.includes('cerrada') || lower.includes('cerrado')) return 'bg-gray-100 text-gray-600 border-gray-200';
  return 'bg-blue-100 text-blue-700 border-blue-200';
}

export function getEstadoDotColor(estado?: string): string {
  const lower = (estado || '').toLowerCase();
  if (lower.includes('pendiente')) return '#ef4444';
  if (lower.includes('atencion') || lower.includes('atención')) return '#f59e0b';
  if (lower.includes('atendida')) return '#22c55e';
  if (lower.includes('cerrada') || lower.includes('cerrado')) return '#9ca3af';
  return '#60a5fa';
}

export default function EstadoBadge({ estado, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getEstadoStyle(estado),
        className
      )}
    >
      {estado || 'Sin estado'}
    </span>
  );
}
