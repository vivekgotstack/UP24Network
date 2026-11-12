export type Role = 'ADMIN' | 'EDITOR' | 'REPORTER' | 'SUBSCRIBER';
export type Account = { id: string; email: string; displayName: string; role: Role };

export class CmsError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CmsError';
  }
}
export async function cms<T>(
  path: string,
  method = 'GET',
  body?: object | URLSearchParams,
): Promise<T> {
  const headers = new Headers();
  if (method !== 'GET') {
    const response = await fetch('/api/cms/auth/csrf', { cache: 'no-store' });
    if (!response.ok)
      throw new CmsError(response.status, 'The newsroom service is unavailable. Please try again.');
    const csrf: { headerName: string; token: string } = await response.json();
    headers.set(csrf.headerName, csrf.token);
  }
  const form = body instanceof URLSearchParams;
  if (body)
    headers.set('content-type', form ? 'application/x-www-form-urlencoded' : 'application/json');
  let response: Response;
  try {
    response = await fetch(`/api/cms/${path}`, {
      method,
      headers,
      cache: 'no-store',
      body: body ? (form ? (body as URLSearchParams) : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new CmsError(503, 'The newsroom service is unavailable. Please try again.');
  }
  if (!response.ok) {
    let detail =
      response.status === 401
        ? 'Your session has ended. Please sign in again.'
        : response.status === 403
          ? 'Your account cannot perform this action. Refresh your session or contact an administrator.'
          : 'The action could not be completed.';
    try {
      const result = await response.json();
      detail = result.detail ?? result.message ?? detail;
    } catch {}
    throw new CmsError(response.status, detail);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
