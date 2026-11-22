import { useEffect, useState } from 'react'

export function usePeople(request, query, revision) {
  const [result, setResult] = useState({ users: [], loading: true, error: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setResult(items => ({ ...items, loading: true, error: '' }))
      try {
        const users = await request('/users?search=' + encodeURIComponent(query), { signal: controller.signal })
        if (!controller.signal.aborted) setResult({ users, loading: false, error: '' })
      } catch (error) {
        if (!controller.signal.aborted) setResult({ users: [], loading: false, error: error.message })
      }
    }, query ? 220 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [request, query, revision, attempt])
  return { ...result, retry: () => setAttempt(value => value + 1) }
}
