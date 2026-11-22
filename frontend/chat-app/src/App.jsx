import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import { Brand, ErrorNotice } from './components/Shared'

export default function App() {
  const [user, setUser] = useState(undefined)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const signOut = useCallback(() => setUser(null), [])

  useEffect(() => {
    const controller = new AbortController()
    api('/auth/me', { signal: controller.signal }).then(setUser).catch(err => {
      if (controller.signal.aborted) return
      if (err.status === 401) setUser(null)
      else setError(err.message)
    })
    return () => controller.abort()
  }, [attempt])

  if (user === undefined) return <main className="grid min-h-dvh place-items-center p-6">
    <div className="grid justify-items-center gap-5"><Brand />
      {error ? <ErrorNotice error={error} retry={() => { setError(''); setAttempt(attempt + 1) }} /> : <p role="status" className="text-sm text-muted">Loading your account…</p>}
    </div>
  </main>

  return user
    ? <Dashboard user={user} onSignOut={signOut} />
    : <Auth onSignIn={setUser} />
}
