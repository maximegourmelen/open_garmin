import { afterEach, expect, test, vi } from 'vitest';
import { ApiError, apiPath, request, setCsrfToken } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
  setCsrfToken(null);
});

test('workspace paths keep demo reads separate', () => {
  expect(apiPath('demo', '/today')).toBe('/api/demo/today');
  expect(apiPath('live', '/today')).toBe('/api/today');
});

test('request carries CSRF for mutations and preserves server detail', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ detail: 'Choose a valid date.' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  setCsrfToken('test-token');
  await expect(
    request('/checkins/2026-11-08', { method: 'PUT', body: '{}' }, 'demo'),
  ).rejects.toMatchObject({ status: 422, message: 'Choose a valid date.' });
  expect(fetchMock.mock.calls[0][0]).toBe('/api/demo/checkins/2026-11-08');
  expect((fetchMock.mock.calls[0][1].headers as Headers).get('X-CSRF-Token')).toBe('test-token');
});

test('network failures become a clear error', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  await expect(request('/today', {}, 'demo')).rejects.toBeInstanceOf(ApiError);
});
