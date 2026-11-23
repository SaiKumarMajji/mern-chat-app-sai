import { useEffect, useRef, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { Avatar, ErrorNotice, IconButton } from './Shared'

import { usePeople } from '../usePeople'

export function SearchField({ value, onChange, label }) {
  return <label className="relative block">
    <Search size={17} className="pointer-events-none absolute top-3.5 left-3.5 text-muted" />
    <input type="search" className="field pl-10" aria-label={label} placeholder={label} value={value} maxLength={50} onChange={event => onChange(event.target.value)} />
  </label>
}

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => { ref.current.showModal() }, [])
  return <dialog ref={ref} onCancel={onClose} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[460px] overflow-auto rounded-[24px] border border-line bg-white p-5 text-ink shadow-2xl backdrop:bg-[#221637]/45 sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
      <IconButton label="Close" icon={X} onClick={onClose} />
    </div>
    {children}
  </dialog>
}

export function PeopleDialog({ kind, request, revision, online, onClose, onSave, conversation, user }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { users, loading, error: searchError, retry } = usePeople(request, query, revision)
  const create = kind === 'group'
  const details = kind === 'details'
  const owner = conversation?.owner === user._id
  const candidates = users.filter(person => !details || !conversation.members.some(member => member._id === person._id))

  async function submit(path, options, close = true) {
    setBusy(true)
    setError('')
    try {
      onSave(await request(path, options))
      if (close) onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function changeMember(id, method) {
    void submit('/conversations/' + conversation._id + '/members/' + id, { method }, false)
  }

  const title = details ? conversation.name : create ? 'Create a group' : 'New message'
  return <Dialog title={title} onClose={onClose}>
    <form className="grid gap-4" onSubmit={event => {
      event.preventDefault()
      if (create) void submit('/conversations/group', { method: 'POST', body: { name, memberIds: selected.map(member => member._id) } })
    }}>
      {create && <label className="label">Group name<input className="field" value={name} onChange={event => setName(event.target.value)} maxLength={60} required /></label>}
      {details && <section>
        <h3 className="mb-2 text-sm font-bold">{conversation.members.length} {conversation.members.length === 1 ? 'member' : 'members'}</h3>
        <ul className="max-h-56 overflow-auto">
          {conversation.members.map(member => <li key={member._id} className="flex items-center gap-3 py-1.5">
            <Avatar name={member.name} online={online.includes(member._id)} />
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{member.name}{member._id === user._id && ' (you)'}</span>
            {member._id === conversation.owner && <span className="text-xs text-muted">Owner</span>}
            {owner && member._id !== user._id && <button type="button" disabled={busy} className="text-sm font-bold text-red-700 hover:underline" onClick={() => changeMember(member._id, 'DELETE')}>Remove<span className="sr-only"> {member.name}</span></button>}
          </li>)}
        </ul>
      </section>}
      {(!details || owner) && <section className="grid gap-2">
        <SearchField value={query} onChange={setQuery} label={details ? 'Find people to add' : 'Search people'} />
        {create && !!selected.length && <div className="flex flex-wrap gap-1.5">
          {selected.map(person => <button type="button" key={person._id} onClick={() => setSelected(items => items.filter(item => item._id !== person._id))}
            className="flex items-center gap-1 rounded-full bg-lavender px-2.5 py-1 text-xs font-bold text-brand" aria-label={'Remove ' + person.name}>{person.name}<X size={12} /></button>)}
        </div>}
        <ErrorNotice error={searchError} retry={retry} />
        {loading ? <p role="status" className="text-sm text-muted">Finding people…</p> : !candidates.length
          ? <p className="text-sm text-muted">{query ? 'No matching people.' : 'No people available.'}</p>
          : <ul className="max-h-56 overflow-auto">
            {candidates.map(person => {
              const checked = selected.some(item => item._id === person._id)
              return <li key={person._id}>
                <button type="button" className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm font-bold hover:bg-paper" disabled={busy || (create && !checked && selected.length >= 49)}
                  aria-pressed={create ? checked : undefined}
                  onClick={() => {
                    if (create) setSelected(items => checked ? items.filter(item => item._id !== person._id) : [...items, person])
                    else if (details) changeMember(person._id, 'PUT')
                    else void submit('/conversations/direct', { method: 'POST', body: { userId: person._id } })
                  }}>
                  <Avatar name={person.name} online={online.includes(person._id)} />
                  <span className="min-w-0 flex-1 truncate">{person.name}</span>
                  {details && <Plus size={17} aria-label="Add" />}
                  {create && <span className={checked ? 'text-brand' : 'text-muted'}>{checked ? 'Selected' : 'Select'}</span>}
                </button>
              </li>
            })}
          </ul>}
      </section>}
      <ErrorNotice error={error} />
      {create && <button type="submit" className="primary" disabled={busy || !name.trim() || !selected.length}>{busy ? 'Creating…' : 'Create group'}</button>}
    </form>
  </Dialog>
}
