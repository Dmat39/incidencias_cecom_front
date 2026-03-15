import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatDate(
  isoString: string | null | undefined,
  pattern: string,
): string {
  if (!isoString) return '-';
  return format(new Date(isoString), pattern, { locale: es });
}
