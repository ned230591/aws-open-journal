import { environments } from '../../../environments/environments';

/**
 * Thin console wrapper: `log`/`warn` are no-ops in production builds,
 * `error` always surfaces (so error-tracking tools that hook console.error
 * still see it).
 */
export const logger = {
  log(...args: unknown[]): void {
    if (!environments.production) {
      console.log(...args);
    }
  },
  warn(...args: unknown[]): void {
    if (!environments.production) {
      console.warn(...args);
    }
  },
  error(...args: unknown[]): void {
    console.error(...args);
  },
};
