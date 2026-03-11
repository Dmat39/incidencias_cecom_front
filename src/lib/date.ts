import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * The backend stores Lima local time as "fake UTC" (e.g. 9:01 AM Lima → "09:01:00Z").
 * Stripping the Z prevents JS from applying a UTC→local conversion that would shift the time.
 */
function parseAsLocal(isoString: string): Date {
  return new Date(isoString.replace('Z', '').replace('+00:00', ''));
}

export function formatDate(
  isoString: string | null | undefined,
  pattern: string,
): string {
  if (!isoString) return '-';
  return format(parseAsLocal(isoString), pattern, { locale: es });
}
