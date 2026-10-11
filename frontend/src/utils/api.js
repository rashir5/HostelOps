export async function apiFetch(url, options = {}) {
  const defaultHeaders = {
    ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    credentials: 'include',
    headers: defaultHeaders
  };

  let res;
  try {
    res = await fetch(url, config);
  } catch (err) {
    throw new Error('Cannot reach the server, please check that it is running');
  }

  // Gateway errors
  if ([502, 503, 504].includes(res.status)) {
    throw new Error('Cannot reach the server, please check that it is running');
  }

  // 401 handling
  if (res.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    const text = await res.text();
    let parsed = null;
    try { parsed = text ? JSON.parse(text) : null; } catch (_) {}
    throw new Error(parsed?.error?.message || parsed?.message || 'Authentication required');
  }

  // 403 handling
  if (res.status === 403) {
    const text = await res.text();
    let parsed = null;
    try { parsed = text ? JSON.parse(text) : null; } catch (_) {}
    throw new Error(parsed?.error?.message || parsed?.message || 'Not allowed');
  }

  const text = await res.text();
  let data = null;
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (!res.ok) {
        throw new Error(text || `Request failed with status ${res.status}`);
      }
      return text;
    }
  }

  if (!res.ok) {
    const detailMsg = Array.isArray(data?.error?.details)
      ? data.error.details.map(d => d.msg || d.message).join(', ')
      : null;
    const errorMsg = detailMsg || data?.error?.message || data?.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}
