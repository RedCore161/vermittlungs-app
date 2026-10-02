/**
 * Thin wrapper around the Django REST API.
 *
 * Authentication uses Django sessions (HttpOnly cookie). Every unsafe request
 * must carry the CSRF token from the `csrftoken` cookie in the `X-CSRFToken`
 * header; the cookie is fetched from /api/auth/csrf/ on demand.
 */

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldErrors;

  constructor(status: number, body: unknown) {
    const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const general = data.non_field_errors ?? data.detail;
    super(Array.isArray(general) ? String(general[0]) : general ? String(general) : `Anfrage fehlgeschlagen (${status}).`);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = Object.fromEntries(
      Object.entries(data)
        .filter(([key]) => key !== 'non_field_errors' && key !== 'detail')
        .map(([key, value]) => [key, Array.isArray(value) ? value.map(String) : [String(value)]]),
    );
  }
}

function getCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

async function ensureCsrfToken(): Promise<string> {
  let token = getCookie('csrftoken');
  if (!token) {
    await fetch('/api/auth/csrf/', { credentials: 'same-origin' });
    token = getCookie('csrftoken');
  }
  return token ?? '';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('X-CSRFToken', await ensureCsrfToken());

  const response = await fetch(path, { ...init, method, headers, credentials: 'same-origin' });
  const text = response.status === 204 ? '' : await response.text();
  const body: unknown = text ? JSON.parse(text) : undefined;

  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

export const api = {
  async getCurrentUser(): Promise<User | null> {
    try {
      return await request<User>('/api/auth/me/');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
      throw error;
    }
  },

  login(email: string, password: string): Promise<User> {
    return request<User>('/api/auth/login/', { method: 'POST', body: JSON.stringify({ email, password }) });
  },

  register(data: RegisterData): Promise<User> {
    return request<User>('/api/auth/register/', { method: 'POST', body: JSON.stringify(data) });
  },

  async logout(): Promise<void> {
    await request<void>('/api/auth/logout/', { method: 'POST' });
  },
};
