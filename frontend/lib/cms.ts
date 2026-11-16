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

export async function csrfHeaders(signal?: AbortSignal) {
  const response = await fetch('/api/cms/auth/csrf', { cache: 'no-store', signal });
  if (!response.ok)
    throw new CmsError(response.status, 'The newsroom service is unavailable. Please try again.');
  const csrf: { headerName: string; token: string } = await response.json();
  return new Headers({ [csrf.headerName]: csrf.token });
}

let renewal: Promise<boolean> | undefined;
let localAuthQueue: Promise<unknown> = Promise.resolve();

/** Serialize cookie-changing responses, including refresh, across browser tabs. */
async function withAuthCookieLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks)
    return await navigator.locks.request('up24-login-renewal', action);
  const pending = localAuthQueue.then(action, action);
  localAuthQueue = pending.then(
    () => undefined,
    () => undefined,
  );
  return await pending;
}

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
  renewal = withAuthCookieLock(renew).finally(() => {
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
  const headers = new Headers();
  const form = body instanceof URLSearchParams;
  if (body)
    headers.set('content-type', form ? 'application/x-www-form-urlencoded' : 'application/json');
  let response: Response;
  const send = async () => {
    // Password login and OTP can rotate CSRF cookies. Read the proof immediately
    // before every send, including the retry after renewing expired credentials.
    if (method !== 'GET') {
      const proof = await csrfHeaders(options?.signal);
      proof.forEach((value, key) => headers.set(key, value));
    }
    return fetch(`/api/cms/${path}`, {
      method,
      headers,
      cache: 'no-store',
      signal: options?.signal,
      body: body ? (form ? (body as URLSearchParams) : JSON.stringify(body)) : undefined,
    });
  };
  const sendRequest = () =>
    method !== 'GET' && path.startsWith('auth/') ? withAuthCookieLock(send) : send();
  try {
    response = await sendRequest();
    if (
      response.status === 401 &&
      !['auth/login', 'auth/register', 'auth/refresh', 'auth/logout'].includes(path) &&
      (await renewLogin())
    )
      response = await sendRequest();
  } catch (error) {
    if (options?.signal?.aborted || error instanceof CmsError) throw error;
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
