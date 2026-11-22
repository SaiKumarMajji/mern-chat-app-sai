import { useCallback, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { api, base } from './api'

function merge(items, changes) {
  const entries = new Map(items.map(item => [item._id, item]))
  changes.forEach(item => entries.set(item._id, { ...entries.get(item._id), ...item }))
  return [...entries.values()]
}

export default function useChat(onSignOut, onConversationRemoved) {
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState({})
  const [online, setOnline] = useState([])
  const [connected, setConnected] = useState(false)
  const [revision, setRevision] = useState(0)
  const [listState, setListState] = useState({ loading: true, error: '' })

  const request = useCallback(async (path, options) => {
    try {
      return await api(path, options)
    } catch (error) {
      if (error.status === 401) onSignOut()
      throw error
    }
  }, [onSignOut])

  const addConversation = useCallback(conversation => {
    setConversations(items => merge(items, [conversation]))
  }, [])

  const addMessages = useCallback((id, entries) => {
    setMessages(items => ({ ...items, [id]: merge(items[id] ?? [], entries)
      .sort((a, b) => a._id.localeCompare(b._id)) }))
  }, [])

  useEffect(() => {
    const socket = io(base || undefined, { withCredentials: true })
    function verifySession() { request('/auth/me').catch(() => {}) }
    socket.on('connect', () => {
      setConnected(true)
      // Fetch a fresh history page so older cached pages cannot hide a reconnect gap.
      setMessages({})
      setRevision(value => value + 1)
    })
    socket.on('disconnect', () => {
      setConnected(false)
      setOnline([])
      verifySession()
    })
    socket.on('connect_error', verifySession)
    socket.on('presence:list', setOnline)
    socket.on('presence:change', ({ id, online: present }) => {
      setOnline(items => present ? [...new Set([...items, id])] : items.filter(item => item !== id))
    })
    socket.on('conversation:updated', addConversation)
    socket.on('conversation:removed', id => {
      onConversationRemoved(id)
      setConversations(items => items.filter(item => item._id !== id))
      setMessages(items => Object.fromEntries(Object.entries(items).filter(([key]) => key !== id)))
    })
    socket.on('message:new', message => addMessages(message.conversation, [message]))
    socket.on('message:read', ({ conversation, reader, through, readAt }) => {
      setMessages(items => ({ ...items, [conversation]: (items[conversation] ?? []).map(message =>
        message._id <= through && message.sender._id !== reader && !message.readAt
          ? { ...message, readAt } : message) }))
    })
    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [request, addConversation, addMessages, onConversationRemoved])

  const reload = useCallback(async (signal) => {
    try {
      const entries = await request('/conversations', { signal })
      if (signal?.aborted) return
      setConversations(entries)
      setListState({ loading: false, error: '' })
    } catch (error) {
      if (!signal?.aborted) setListState({ loading: false, error: error.message })
    }
  }, [request])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => reload(controller.signal), 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [revision, reload])

  return { conversations, messages, online, connected, revision, listState, reload, request, addConversation, addMessages }
}
