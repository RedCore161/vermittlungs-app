import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the current user', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1, username: 'anna', email: 'anna@example.com', first_name: '', last_name: '' }));

    const user = await api.getCurrentUser();

    expect(user?.email).toBe('anna@example.com');
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me/', expect.objectContaining({ credentials: 'same-origin' }));
  });

  it('returns null for the current user when not logged in', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'Not authenticated' }, 403));

    await expect(api.getCurrentUser()).resolves.toBeNull();
  });

  it('fetches a CSRF cookie before posting and sends it as header', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/auth/csrf/') {
        document.cookie = 'csrftoken=token-123; path=/';
        return jsonResponse({ detail: 'ok' });
      }
      return jsonResponse({ id: 1, username: 'anna', email: 'anna@example.com', first_name: '', last_name: '' });
    });

    await api.login('anna', 'secret');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf/', expect.anything());
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/auth/login/');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('X-CSRFToken')).toBe('token-123');
    expect(JSON.parse(init.body)).toEqual({ identifier: 'anna', password: 'secret' });
  });

  it('reuses an existing CSRF cookie', async () => {
    document.cookie = 'csrftoken=existing; path=/';
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await api.logout();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('X-CSRFToken')).toBe('existing');
  });

  it('throws an ApiError with field errors on validation failure', async () => {
    document.cookie = 'csrftoken=t; path=/';
    fetchMock.mockResolvedValueOnce(jsonResponse({ email: ['Ein Konto existiert bereits.'] }, 400));

    const error = await api
      .register({ username: 'anna', email: 'anna@example.com', password: 'S3cure-pass!' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).fieldErrors).toEqual({ email: ['Ein Konto existiert bereits.'] });
  });

  it('uses non_field_errors / detail as the general error message', async () => {
    document.cookie = 'csrftoken=t; path=/';
    fetchMock.mockResolvedValueOnce(jsonResponse({ non_field_errors: ['E-Mail-Adresse oder Passwort ist falsch.'] }, 400));

    const error = (await api.login('a@b.de', 'x').catch((e: unknown) => e)) as ApiError;

    expect(error.message).toBe('E-Mail-Adresse oder Passwort ist falsch.');
  });
});
