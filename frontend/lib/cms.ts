export type Role = 'ADMIN' | 'EDITOR' | 'REPORTER' | 'SUBSCRIBER';
export type Account = { id: string; email: string; displayName: string; role: Role };

export async function cms<T>(path: string, method = 'GET', body?: object | URLSearchParams): Promise<T> {
  const headers = new Headers();
  if (method !== 'GET') {
    const csrfResponse = await fetch('/api/cms/auth/csrf', { cache: 'no-store' });
    if (!csrfResponse.ok) throw new Error('The newsroom service is unavailable.');
    const csrf = await csrfResponse.json(); headers.set(csrf.headerName, csrf.token);
  }
  const form = body instanceof URLSearchParams;
  if (body) headers.set('content-type', form ? 'application/x-www-form-urlencoded' : 'application/json');
  const response = await fetch(`/api/cms/${path}`, {
    method, headers, cache: 'no-store', body: body ? (form ? body as URLSearchParams : JSON.stringify(body)) : undefined,
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Sign in with a valid email and password.');
    if (response.status === 403) throw new Error('Your account cannot perform this action.');
    let detail = 'The action could not be completed.';
    try { const result = await response.json(); detail = result.detail ?? result.message ?? detail; } catch {}
    throw new Error(detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
