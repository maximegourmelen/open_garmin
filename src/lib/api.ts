export type WorkspaceMode = 'demo' | 'live';

let csrfToken: string | null = null;
export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiPath(mode: WorkspaceMode, path: string) {
  return `/api${mode === 'demo' ? '/demo' : ''}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  mode?: WorkspaceMode,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  if (csrfToken && options.method && options.method.toUpperCase() !== 'GET')
    headers.set('X-CSRF-Token', csrfToken);
  let response: Response;
  try {
    response = await fetch(
      mode ? apiPath(mode, path) : `/api${path.startsWith('/') ? path : `/${path}`}`,
      { ...options, headers, credentials: 'same-origin' },
    );
  } catch {
    throw new ApiError('The app server is unreachable. Your data has not been changed.', 0);
  }
  if (!response.ok) {
    let detail = 'Something went wrong. Please try again.';
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') detail = body.detail;
    } catch {
      /* preserve fallback */
    }
    throw new ApiError(detail, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function workspaceRequest<T>(mode: WorkspaceMode, path: string, options?: RequestInit) {
  return request<T>(path, options, mode);
}
