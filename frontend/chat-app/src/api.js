export const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function api(path, { body, ...options } = {}) {
  const response = await fetch(base + '/api' + path, {
    credentials: 'include',
    ...options,
    ...(body === undefined ? {} : {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  })
  if (response.status === 204) return
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw Object.assign(new Error(data?.error || 'The server is unavailable. Try again.'), {
      status: response.status,
    })
  }
  return data
}
