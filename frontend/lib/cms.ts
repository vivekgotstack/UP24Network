export type Role = 'ADMIN' | 'EDITOR' | 'REPORTER' | 'SUBSCRIBER';
export type Account = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  newsroomEligible?: boolean;
  newsroomAccess?: boolean;
};

export class CmsError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly problemType?: string,
  ) {
    super(message);
    this.name = 'CmsError';
  }
}

async function csrfHeaders() {
  const response = await fetch('/api/cms/auth/csrf', { cache: 'no-store' });
  if (!response.ok)
    throw new CmsError(response.status, 'The newsroom service is unavailable. Please try again.');
  const csrf: { headerName: string; token: string } = await response.json();
  return new Headers({ [csrf.headerName]: csrf.token });
}

let renewal: Promise<boolean> | undefined;

/** One renewal per origin, across components and (where supported) browser tabs. */
export function renewLogin(): Promise<boolean> {
  if (renewal) return renewal;
  const renew = async () => {
    const current = await fetch('/api/cms/auth/me', { cache: 'no-store' });
    if (current.ok) return true;
    if (current.status !== 401)
      throw new CmsError(current.status, 'Your account could not be refreshed.');
    const response = await fetch('/api/cms/auth/refresh', {
      method: 'POST',
      headers: await csrfHeaders(),
      cache: 'no-store',
    });
    if (response.status === 401) return false;
    if (!response.ok) throw new CmsError(response.status, 'Your account could not be refreshed.');
    return true;
  };
  const synchronizedRenew = async () =>
    typeof navigator !== 'undefined' && navigator.locks
      ? await navigator.locks.request('up24-login-renewal', renew)
      : await renew();
  renewal = synchronizedRenew().finally(() => {
    renewal = undefined;
  });
  return renewal;
}

export async function cms<T>(
  path: string,
  method = 'GET',
  body?: object | URLSearchParams,
  options?: { signal?: AbortSignal },
): Promise<T> {
  let headers = new Headers();
  if (method !== 'GET') {
    try {
      headers = await csrfHeaders();
    } catch {
      throw new CmsError(503, 'The newsroom service is unavailable. Please try again.');
    }
  }
  const form = body instanceof URLSearchParams;
  if (body)
    headers.set('content-type', form ? 'application/x-www-form-urlencoded' : 'application/json');
  let response: Response;
  const send = () =>
    fetch(`/api/cms/${path}`, {
      method,
      headers,
      cache: 'no-store',
      signal: options?.signal,
      body: body ? (form ? (body as URLSearchParams) : JSON.stringify(body)) : undefined,
    });
  try {
    response = await send();
    if (
      response.status === 401 &&
      !['auth/login', 'auth/register', 'auth/refresh', 'auth/logout'].includes(path) &&
      (await renewLogin())
    )
      response = await send();
  } catch {
    throw new CmsError(503, 'The newsroom service is unavailable. Please try again.');
  }
  if (!response.ok) {
    let problemType: string | undefined;
    let detail =
      response.status === 401
        ? 'Your session has ended. Please sign in again.'
        : response.status === 403
          ? 'Your account cannot perform this action. Refresh your session or contact an administrator.'
          : 'The action could not be completed.';
    try {
      const result = await response.json();
      if (typeof result.detail === 'string') detail = result.detail;
      else if (typeof result.message === 'string') detail = result.message;
      if (typeof result.type === 'string') problemType = result.type;
    } catch {}
    throw new CmsError(response.status, detail, problemType);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
