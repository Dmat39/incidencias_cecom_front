import { cn } from '@/lib/utils';

interface Props {
  estado?: string;
  className?: string;
}

function getEstadoStyle(estado?: string) {
  const lower = (estado || '').toLowerCase();
  if (lower.includes('pendiente')) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40';
  if (lower.includes('atencion') || lower.includes('atención')) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/40';
  if (lower.includes('atendida')) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40';
  if (lower.includes('cerrada') || lower.includes('cerrado')) return 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600/40';
  return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40';
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
