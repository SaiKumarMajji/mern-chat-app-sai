import { useState } from 'react'
import { ArrowRight, MessageCircle, Send, Users } from 'lucide-react'
import { api } from '../api'
import { Brand, ErrorNotice } from './Shared'

export default function Auth({ onSignIn }) {
  const [signup, setSignup] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    const body = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true)
    setError('')
    try {
      if (signup && new TextEncoder().encode(body.password).length > 72) {
        throw new Error('Use a password of at most 72 bytes.')
      }
      onSignIn(await api(signup ? '/auth/signup' : '/auth/login', { method: 'POST', body }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return <main className="mx-auto grid min-h-dvh max-w-[1440px] p-4 sm:p-6 lg:grid-cols-2">
    <section className="relative hidden min-h-[660px] flex-col justify-between overflow-hidden rounded-[32px] bg-[#241646] p-12 text-white lg:flex">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_52%,#6337bb_0%,transparent_64%)]" aria-hidden="true" />
      <div className="relative"><Brand /></div>
      <div aria-hidden="true" className="relative mx-auto grid aspect-square w-[min(100%,350px)] place-items-center">
        <div className="absolute inset-2 rounded-full border border-white/15" />
        <div className="absolute inset-9 rounded-full border border-dashed border-white/25" />
        <div className="absolute inset-[4.5rem] rounded-full border border-white/20" />
        <div className="grid size-32 -rotate-12 place-items-center rounded-[34px] border border-white/25 bg-[#8052ec] shadow-2xl shadow-[#190a40]/65"><MessageCircle size={64} strokeWidth={1.55} /></div>
        <div className="absolute top-12 right-14 grid size-14 rotate-12 place-items-center rounded-[18px] border border-white/15 bg-[#37225f] text-[#d8c6ff]"><Send size={24} /></div>
        <div className="absolute bottom-12 left-10 grid size-16 rotate-8 place-items-center rounded-[19px] border border-white/80 bg-[#e5d8ff] text-brand"><Users size={27} /></div>
        <span className="absolute top-18 left-14 size-2 rounded-full bg-[#d6baff]" />
        <span className="absolute right-11 bottom-24 size-2.5 rounded-full bg-[#bb94ff]" />
      </div>
      <div className="relative">
        <h2 className="max-w-md text-5xl leading-[1.04] font-extrabold tracking-tight">Good conversations start here.</h2>
        <p className="mt-4 max-w-sm text-base leading-7 text-[#dfd2f8]">Message someone directly or bring everyone together in a group.</p>
      </div>
    </section>

    <section className="flex min-h-[calc(100dvh-2rem)] items-center justify-center px-3 py-10 sm:px-12 lg:min-h-0">
      <div className="w-full max-w-[390px]">
        <div className="mb-10 lg:hidden"><Brand /></div>
        <h1 className="text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">{signup ? 'Create an account' : 'Welcome back'}</h1>
        <p className="mt-3 text-muted">{signup ? 'Join Relay to start chatting.' : 'Sign in to your Relay account.'}</p>
        <form key={signup} onSubmit={submit} className="mt-8 grid gap-4">
          {signup && <label className="label">Name<input className="field" name="name" autoComplete="name" required minLength={2} maxLength={50} placeholder="Your name" /></label>}
          <label className="label">Email address<input className="field" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
          <label className="label">Password<input className="field" name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : undefined} maxLength={72} required placeholder={signup ? 'At least 8 characters' : 'Your password'} /></label>
          <ErrorNotice error={error} />
          <button disabled={busy} className="primary mt-1 min-h-12">{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'} <ArrowRight size={17} /></button>
        </form>
        <p className="mt-6 text-sm text-muted">
          {signup ? 'Already have an account?' : 'New to Relay?'}{' '}
          <button disabled={busy} className="font-bold text-brand hover:underline" onClick={() => { setError(''); setSignup(!signup) }}>
            {signup ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </div>
    </section>
  </main>
}
