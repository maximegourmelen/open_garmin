let csrf: string | null = null;
export function setCsrf(value: string | null) { csrf = value; }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string,string> = {'Content-Type':'application/json', ...(options.headers as Record<string,string> ?? {})};
  if (csrf) headers['X-CSRF-Token'] = csrf;
  let response: Response;
  try { response = await fetch(`/api${path}`, {...options,headers,credentials:'same-origin'}); }
  catch { throw new Error('The app server is unreachable. Your data has not been changed.'); }
  if (!response.ok) {
    let detail = 'Something went wrong. Please try again.';
    try { const body = await response.json(); if (typeof body.detail === 'string') detail = body.detail; } catch { /* non-JSON server error */ }
    throw new Error(detail);
  }
  return response.json();
}
export function download(name: string, content: string, type='application/json') {
  const url = URL.createObjectURL(new Blob([content],{type})); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
