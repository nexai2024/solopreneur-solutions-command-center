import { toast } from 'sonner';
import { logger } from './logger';

export interface ErrorOptions {
  showToast?: boolean;
  message?: string;
  data?: any;
}

export async function handleError<T>(
  promise: Promise<T> | (() => Promise<T>),
  options: ErrorOptions = {}
): Promise<[T | null, Error | null]> {
  const { showToast = true, message = 'An unexpected error occurred', data } = options;

  try {
    const result = typeof promise === 'function' ? await promise() : await promise;
    return [result, null];
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(error?.message || String(error));

    logger.error(message, { error: err, ...data });

    if (showToast) {
      toast.error(message, {
        description: err.message,
      });
    }

    return [null, err];
  }
}

/**
 * Standard Supabase error handler
 */
export function handleSupabaseError(error: any, customMessage: string) {
  if (error) {
    logger.error(customMessage, error);
    toast.error(customMessage, {
      description: error.message,
    });
    return true;
  }
  return false;
}
