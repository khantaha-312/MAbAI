import { Logger } from '@nestjs/common';

export interface FetchWithBackoffOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  logger?: Logger;
  context?: string;
}

/**
 * Fetch with exponential backoff and Retry-After header support.
 * Handles 429 (Too Many Requests) and 5xx errors with automatic retry.
 *
 * @param url URL to fetch
 * @param options RequestInit options
 * @param backoffOptions Backoff configuration
 * @returns Response or throws if max retries exceeded
 */
export async function fetchWithBackoff(
  url: string,
  options: RequestInit = {},
  backoffOptions: FetchWithBackoffOptions = {},
): Promise<Response> {
  const {
    maxRetries = 3,
    initialBackoffMs = 1000,
    maxBackoffMs = 30000,
    logger,
    context = 'fetch',
  } = backoffOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Success - return response
      if (response.ok) {
        if (attempt > 0 && logger) {
          logger.log(`${context}: succeeded on attempt ${attempt + 1}/${maxRetries + 1}`);
        }
        return response;
      }

      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
        const backoffMs = Math.min(
          retryAfter * 1000,
          Math.min(initialBackoffMs * Math.pow(2, attempt), maxBackoffMs),
        );

        if (logger) {
          logger.warn(
            `${context}: rate limited (429), retrying after ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`,
          );
        }

        if (attempt < maxRetries) {
          await sleep(backoffMs);
          continue;
        }
      }

      // Handle server errors (5xx) with backoff
      if (response.status >= 500 && response.status < 600) {
        const backoffMs = Math.min(
          initialBackoffMs * Math.pow(2, attempt),
          maxBackoffMs,
        );

        if (logger) {
          logger.warn(
            `${context}: server error (${response.status}), retrying after ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`,
          );
        }

        if (attempt < maxRetries) {
          await sleep(backoffMs);
          continue;
        }
      }

      // Client errors (4xx except 429) - don't retry
      const errorBody = await response.text();
      lastError = new Error(
        `${context}: API error ${response.status} - ${errorBody || response.statusText}`,
      );

      if (logger) {
        logger.error(`${context}: client error ${response.status} - ${errorBody}`);
      }

      throw lastError;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on network errors for simplicity
      if (logger) {
        logger.error(`${context}: fetch failed - ${(error as Error).message}`);
      }

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff for network errors
      const backoffMs = Math.min(
        initialBackoffMs * Math.pow(2, attempt),
        maxBackoffMs,
      );

      if (logger) {
        logger.warn(
          `${context}: network error, retrying after ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`,
        );
      }

      await sleep(backoffMs);
    }
  }

  throw lastError || new Error(`${context}: Max retries exceeded`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
