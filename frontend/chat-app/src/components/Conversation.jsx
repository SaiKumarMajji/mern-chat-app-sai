import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, CheckCheck, Info, Send } from 'lucide-react'
import { Avatar, Empty, ErrorNotice, IconButton } from './Shared'

const clock = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const calendar = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export default function Conversation({ user, conversation, title, present, connected, revision, messages, request, addMessages, onBack, onDetails }) {
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState([])
  const [history, setHistory] = useState({ loading: true, more: false, error: '' })
  const [retry, setRetry] = useState(0)
  const scroller = useRef(null)
  const scrollUpdate = useRef(null)
  const id = conversation._id
  const path = '/conversations/' + id
  const group = conversation.kind === 'group'

  useEffect(() => {
    const controller = new AbortController()
    request(path + '/messages', { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return
      addMessages(id, result.messages)
      setHistory({ loading: false, more: result.more, error: '' })
    }).catch(error => {
      if (!controller.signal.aborted) setHistory({ loading: false, more: false, error: error.message })
    })
    return () => controller.abort()
  }, [id, path, revision, retry, request, addMessages])

  const through = messages.at(-1)?._id
  useEffect(() => {
    if (group || !through) return
    function markRead() {
      if (document.visibilityState === 'visible') {
        request(path + '/read', { method: 'POST', body: { through } }).catch(() => {})
      }
    }
    markRead()
    document.addEventListener('visibilitychange', markRead)
    return () => document.removeEventListener('visibilitychange', markRead)
  }, [path, through, group, revision, request])

  useEffect(() => {
    const element = scroller.current
    if (!element) return
    const previous = scrollUpdate.current
    if (previous !== null) {
      element.scrollTop = element.scrollHeight - previous
      scrollUpdate.current = null
    } else {
      element.scrollTop = element.scrollHeight
    }
  }, [through, messages.length, pending.length, history.loading])

  async function loadOlder() {
    setHistory(state => ({ ...state, loading: true, error: '' }))
    try {
      const result = await request(path + '/messages?before=' + messages[0]._id)
      if (scroller.current) scrollUpdate.current = scroller.current.scrollHeight - scroller.current.scrollTop
      addMessages(id, result.messages)
      setHistory({ loading: false, more: result.more, error: '' })
    } catch (error) {
      setHistory({ loading: false, more: true, error: error.message })
    }
  }

  async function send(message) {
    setPending(items => [...items.filter(item => item.clientId !== message.clientId), { ...message, error: '' }])
    try {
      const saved = await request(path + '/messages', { method: 'POST', body: { text: message.text, clientId: message.clientId } })
      addMessages(id, [saved])
      setPending(items => items.filter(item => item.clientId !== message.clientId))
    } catch (error) {
      setPending(items => items.map(item => item.clientId === message.clientId ? { ...item, error: error.message } : item))
    }
  }

  function submit(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setDraft('')
    void send({ text, clientId: crypto.randomUUID(), createdAt: new Date().toISOString(), sender: user })
  }

  const entries = [...messages, ...pending.filter(item => !messages.some(saved => saved.sender._id === user._id && saved.clientId === item.clientId))]
  return <section aria-label={title} className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#faf8fd]">
    <header className="flex min-h-[73px] shrink-0 items-center gap-3 border-b border-line bg-white px-3 sm:px-6">
      <div className="md:hidden"><IconButton icon={ArrowLeft} label="Back to chats" onClick={onBack} /></div>
      <Avatar group={group} name={title} online={present} />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg leading-tight font-extrabold">{title}</h1>
        <p className="mt-0.5 text-xs text-muted">{group ? conversation.members.length + (conversation.members.length === 1 ? ' member' : ' members') : present ? 'Online' : connected ? 'Offline' : 'Presence unavailable'}</p>
      </div>
      {group && <IconButton icon={Info} label="Group details" onClick={onDetails} />}
    </header>

    <div ref={scroller} role="region" aria-label="Message history" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-[820px] flex-1 flex-col gap-3">
        {history.loading && <p role="status" className="text-center text-sm text-muted">Loading messages…</p>}
        {history.error && <ErrorNotice error={history.error} retry={history.more ? loadOlder : () => { setHistory({ loading: true, more: false, error: '' }); setRetry(value => value + 1) }} />}
        {history.more && !history.loading && <button type="button" onClick={loadOlder} className="secondary mx-auto">Load older messages</button>}
        {!entries.length && !history.loading && !history.error && <Empty title="Start the conversation">Send the first message below.</Empty>}
        {entries.map((message, index) => {
          const mine = message.sender._id === user._id
          const date = new Date(message.createdAt)
          const day = calendar.format(date)
          const previous = entries[index - 1]
          const newDay = !previous || day !== calendar.format(new Date(previous.createdAt))
          return <div key={message._id || message.clientId}>
            {newDay && <div className="my-3 flex items-center justify-center gap-3 text-xs font-bold text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">{day}</div>}
            <div className={`flex items-end gap-2 ${mine ? 'justify-end' : ''}`}>
              {!mine && <Avatar name={message.sender.name} />}
              <div className={`max-w-[82%] sm:max-w-[72%] ${mine ? 'text-right' : ''}`}>
                {!mine && group && <p className="mb-1 text-xs font-bold text-muted">{message.sender.name}</p>}
                <p className={`rounded-2xl px-3.5 py-2.5 text-left text-sm leading-6 wrap-anywhere whitespace-pre-wrap ${mine ? 'rounded-br-sm bg-brand text-white' : 'rounded-bl-sm border border-line bg-white'}`}>{message.text}</p>
                <div className={`mt-1 flex items-center gap-1.5 text-[11px] text-muted ${mine ? 'justify-end' : ''}`}>
                  <time dateTime={message.createdAt}>{clock.format(date)}</time>
                  {mine && (message.error
                    ? <button className="font-bold text-red-700 underline" title={message.error} onClick={() => send(message)}>Failed · Retry</button>
                    : !message._id ? <span>Sending…</span>
                    : message.readAt ? <span className="inline-flex items-center gap-0.5 text-brand"><CheckCheck size={14} /> Read</span>
                    : <span className="inline-flex items-center gap-0.5"><Check size={14} /> Sent</span>)}
                </div>
              </div>
            </div>
          </div>
        })}
      </div>
    </div>

    <footer className="shrink-0 border-t border-line bg-white px-3 py-3 sm:px-6 sm:py-4">
      <form onSubmit={submit} className="mx-auto flex max-w-[820px] items-end gap-2">
        <textarea rows={1} aria-label="Message" className="field max-h-32 min-h-11 resize-y py-2.5 leading-6" placeholder="Write a message…" value={draft} maxLength={4000}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              event.currentTarget.form.requestSubmit()
            }
          }} />
        <button type="submit" aria-label="Send message" title="Send message" disabled={!draft.trim()} className="primary size-11 shrink-0 px-0"><Send size={18} /></button>
      </form>
    </footer>
  </section>
}
