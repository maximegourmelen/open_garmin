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
export async function uploadFit(file: File): Promise<{id:string;status:'imported'|'duplicate'}> {
  const form = new FormData(); form.append('file',file);
  let response: Response;
  try { response=await fetch('/api/import/fit',{method:'POST',body:form,headers:csrf?{'X-CSRF-Token':csrf}:{},credentials:'same-origin'}); }
  catch { throw new Error('The app server is unreachable. Your file was not imported.'); }
  if (!response.ok) { let message='The FIT file could not be imported.'; try { const body=await response.json(); if(typeof body.detail==='string') message=body.detail; } catch { /* preserve default */ } throw new Error(message); }
  return response.json();
}
export function download(name: string, content: string, type='application/json') {
  const url = URL.createObjectURL(new Blob([content],{type})); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
