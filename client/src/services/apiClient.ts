/**
 * Minimal HTTP client for the server API: builds the URL, sends JSON, and
 * turns unsuccessful responses into errors carrying the server's message.
 * Every service goes through it, so the base URL and the error convention
 * are defined once.
 */

/**
 * Base URL of the server. Set REACT_APP_API_URL at build time (e.g. in a
 * .env file or in the hosting service) to point the client elsewhere.
 */
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3005';

/** An unsuccessful response from the server. */
export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Sends a request and returns the parsed JSON body (undefined for 204).
 * @param path path relative to the API base URL, e.g. '/api/students'
 * @param failureMessage message used when the server sends no error message
 * @param init fetch options (method, body...)
 */
export async function request<T>(path: string, failureMessage: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    throw new ApiError(response.status, await errorMessageOf(response, failureMessage));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

/** GET a resource. */
export const get = <T>(path: string, failureMessage: string): Promise<T> =>
  request<T>(path, failureMessage);

/** Send a JSON body with the given method (POST or PUT). */
export const sendJson = <T>(method: 'POST' | 'PUT', path: string, body: unknown, failureMessage: string): Promise<T> =>
  request<T>(path, failureMessage, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

/** DELETE a resource. */
export const remove = (path: string, failureMessage: string): Promise<void> =>
  request<void>(path, failureMessage, { method: 'DELETE' });

async function errorMessageOf(response: Response, failureMessage: string): Promise<string> {
  try {
    const body = await response.json();
    if (body && typeof body.error === 'string') {
      return body.error;
    }
  } catch {
    // no JSON body: use the generic message below
  }
  return `${failureMessage}: ${response.statusText}`;
}
