import { useCallback, useState } from 'react'
import { LogOut, MessageSquarePlus, Users, WifiOff } from 'lucide-react'
import useChat from '../useChat'
import { usePeople } from '../usePeople'
import Conversation from './Conversation'
import { PeopleDialog, SearchField } from './People'
import { Avatar, Brand, Empty, ErrorNotice, IconButton } from './Shared'

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

function shortDate(value) {
  const date = new Date(value)
  return date.toDateString() === new Date().toDateString() ? timeFormat.format(date) : dateFormat.format(date)
}

function ChatRow({ name, summary, timestamp, group, online, active, onClick }) {
  return <button type="button" aria-current={active ? 'true' : undefined} onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-2xl border px-2.5 py-2.5 text-left transition ${active ? 'border-[#e4d8ff] bg-lavender' : 'border-transparent hover:bg-paper'}`}>
    <Avatar name={name} group={group} online={online} />
    <span className="min-w-0 flex-1">
      <span className="flex items-center justify-between gap-1.5">
        <span className="truncate text-sm font-extrabold">{name}</span>
        {timestamp && <time dateTime={timestamp} className="shrink-0 text-[10px] font-semibold text-muted">{shortDate(timestamp)}</time>}
      </span>
      <span className="mt-0.5 block truncate text-xs text-muted">{summary}</span>
    </span>
  </button>
}

export default function Dashboard({ user, onSignOut }) {
  const [active, setActive] = useState(null)
  const closeRemoved = useCallback(id => setActive(current => current === id ? null : current), [])
  const chat = useChat(onSignOut, closeRemoved)
  const { conversations, request, online, revision, addConversation, addMessages, connected, listState, reload } = chat
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const people = usePeople(request, query, revision + online.length)
  const current = conversations.find(item => item._id === active)
  const isOnline = id => online.includes(id)
  const peer = item => item.members.find(member => member._id !== user._id)
  const name = item => item.kind === 'group' ? item.name : peer(item)?.name || 'Conversation'
  const results = conversations
    .filter(item => (filter !== 'Groups' || item.kind === 'group') && name(item).toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  function open(conversation) {
    addConversation(conversation)
    setActive(conversation._id)
  }

  async function action(callback) {
    setError('')
    setBusy(true)
    try { await callback() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return <main className="relative flex h-dvh min-h-0 flex-col bg-white md:grid md:grid-cols-[minmax(260px,315px)_1fr] lg:grid-cols-[340px_1fr]">
    <aside aria-label="Chats" className={`${current ? 'hidden md:flex' : 'flex'} min-h-0 min-w-0 flex-1 flex-col border-r border-line`}>
      <div className="flex h-[73px] shrink-0 items-center justify-between border-b border-line px-5">
        <Brand />
        <IconButton icon={MessageSquarePlus} label="New message" onClick={() => setDialog('direct')} />
      </div>

      <div className="space-y-4 px-4 pt-5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight">Chats</h1>
          <button type="button" className="secondary" onClick={() => setDialog('group')}><Users size={16} /> New group</button>
        </div>
        <SearchField value={query} onChange={setQuery} label="Search chats and people" />
        <div className="flex gap-1 rounded-xl bg-paper p-1" aria-label="Filter chats">
          {['All', 'Groups', 'People'].map(item => <button type="button" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold ${filter === item ? 'bg-white text-brand shadow-sm' : 'text-muted hover:text-brand'}`}>{item}</button>)}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <ErrorNotice error={error} />
        {filter !== 'People' && <section aria-label="Recent conversations">
          <h2 className="px-2 pb-2 text-xs font-extrabold tracking-wide text-muted uppercase">Recent</h2>
          <ErrorNotice error={listState.error} retry={() => reload()} />
          {listState.loading && <p role="status" className="px-2 text-sm text-muted">Loading chats…</p>}
          {!listState.loading && !listState.error && !results.length && <p className="px-2 text-sm text-muted">{query ? 'No matching conversations.' : filter === 'Groups' ? 'No groups yet.' : 'No conversations yet.'}</p>}
          {results.map(item => <ChatRow key={item._id} name={name(item)} summary={item.lastMessage?.text || (item.kind === 'group' ? item.members.length + (item.members.length === 1 ? ' member' : ' members') : 'No messages yet')}
            timestamp={item.lastMessage?.createdAt} active={active === item._id} online={isOnline(peer(item)?._id) && item.kind === 'direct'} group={item.kind === 'group'} onClick={() => setActive(item._id)} />)}
        </section>}
        {filter !== 'Groups' && <section aria-label="People">
          <h2 className="px-2 pb-2 text-xs font-extrabold tracking-wide text-muted uppercase">People</h2>
          <ErrorNotice error={people.error} retry={people.retry} />
          {people.loading ? <p role="status" className="px-2 text-sm text-muted">Loading people…</p> : !people.users.length && !people.error
            ? <p className="px-2 text-sm text-muted">{query ? 'No matching people.' : 'No other users have joined yet.'}</p>
            : people.users.map(person => <ChatRow key={person._id} name={person.name} summary={isOnline(person._id) ? 'Online' : connected ? 'Offline' : 'Presence unavailable'}
                online={isOnline(person._id)} onClick={() => {
                  if (!busy) void action(async () => open(await request('/conversations/direct', { method: 'POST', body: { userId: person._id } })))
                }} />)}
        </section>}
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-line px-4 py-3">
        <Avatar name={user.name} online={connected} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{user.name}</p>
          <p className="flex items-center gap-1 text-xs text-muted" role="status">{connected ? 'Connected' : <><WifiOff size={12} /> Reconnecting…</>}</p>
        </div>
        <IconButton icon={LogOut} label="Sign out" disabled={busy} onClick={() => action(async () => {
          await request('/auth/logout', { method: 'POST' })
          onSignOut()
        })} />
      </div>
    </aside>

    {current ? <Conversation key={current._id} user={user} conversation={current} title={name(current)} present={current.kind === 'direct' && isOnline(peer(current)?._id)}
      connected={connected} revision={revision} messages={chat.messages[current._id] ?? []} request={request} addMessages={addMessages}
      onBack={() => setActive(null)} onDetails={() => setDialog('details')} />
      : <section className="hidden min-h-0 min-w-0 flex-col bg-[#faf8fd] md:flex">
        <Empty title="Pick a conversation">
          <p>Select a chat or start a conversation with someone.</p>
          <button type="button" className="primary mt-5" onClick={() => setDialog('direct')}><MessageSquarePlus size={17} /> New message</button>
        </Empty>
      </section>}

    {dialog && (dialog !== 'details' || current) && <PeopleDialog key={dialog} kind={dialog} request={request} revision={revision}
      online={online} user={user} conversation={current} onClose={() => setDialog(null)} onSave={open} />}
  </main>
}
