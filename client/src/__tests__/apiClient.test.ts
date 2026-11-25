import { API_BASE_URL, ApiError, get, remove, request, sendJson } from '../services/apiClient';

describe('apiClient', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as any;
  });

  test('defaults the base URL to the local server', () => {
    expect(API_BASE_URL).toBe('http://localhost:3005');
  });

  test('get returns the JSON body of a successful response', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [1, 2] });
    await expect(get('/api/x', 'Failed')).resolves.toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/x', undefined);
  });

  test('sendJson posts the body as JSON', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 1 }) });
    await expect(sendJson('POST', '/api/x', { a: 1 }, 'Failed')).resolves.toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/x', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}'
    });
  });

  test('remove resolves to undefined on 204 without reading a body', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('no body'); } });
    await expect(remove('/api/x/1', 'Failed')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/x/1', { method: 'DELETE' });
  });

  test("rejects with the server's error message and status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found', json: async () => ({ error: 'Class not found' }) });
    const failure = request('/api/x', 'Failed to fetch x').catch(e => e);
    await expect(failure).resolves.toBeInstanceOf(ApiError);
    await expect(failure).resolves.toMatchObject({ status: 404, message: 'Class not found' });
  });

  test('falls back to the given message when the server sends no error message', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, statusText: 'Bad Gateway', json: async () => { throw new Error('html'); } });
    await expect(request('/api/x', 'Failed to fetch x')).rejects.toThrow('Failed to fetch x: Bad Gateway');
    fetchMock.mockResolvedValue({ ok: false, status: 500, statusText: 'Oops', json: async () => ({}) });
    await expect(request('/api/x', 'Failed to fetch x')).rejects.toThrow('Failed to fetch x: Oops');
  });
});
