import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import * as chatService from '../services/chatService'
import { getSocket } from '../services/socketService'
import { useNotifications } from './NotificationsContext'

const ChatContext = createContext(null)

function normalizeMessage(message, currentUserId) {
  return {
    id: message.id,
    senderId: message.sender_id === currentUserId ? 'me' : message.sender_id,
    type: message.kind || 'text',
    text: message.body || '',
    replyTo: message.reply_to_id,
    mediaUrl: message.media_url || null,
    time: message.sent_at,
    status: message.status || 'delivered',
  }
}

function normalizeConversation(row, currentUserId) {
  const last = row.last_message_id ? normalizeMessage({
    id: row.last_message_id, body: row.last_message_body, kind: row.last_message_kind,
    sender_id: row.last_message_sender_id, sent_at: row.last_message_sent_at,
  }, currentUserId) : null
  return {
    id: row.id,
    participantId: row.participant_id,
    participant: {
      id: row.participant_id,
      name: row.participant_name || 'Member',
      username: row.username,
      avatar: row.avatar_url,
    },
    pinned: Boolean(row.pinned_at),
    archived: Boolean(row.archived_at),
    unread: Number(row.unread_count || 0),
    messages: last ? [last] : [],
    messagesLoaded: false,
  }
}

export function ChatProvider({ children }) {
  const { user } = useAuth()
  const { markConversationNotificationsRead } = useNotifications()
  const [conversations, setConversations] = useState([])
  const [typing, setTyping] = useState({})
  const [loading, setLoading] = useState(false)
  const [chatError, setChatError] = useState('')

  const refreshConversations = useCallback(async () => {
    if (!user?.id) return []
    setLoading(true)
    setChatError('')
    try {
      const rows = await chatService.listConversations()
      const normalized = rows.map((row) => normalizeConversation(row, user.id))
      setConversations((previous) => normalized.map((conversation) => {
        const existing = previous.find((item) => item.id === conversation.id)
        return existing?.messagesLoaded ? { ...conversation, messages: existing.messages, messagesLoaded: true } : conversation
      }))
      return normalized
    } catch (error) {
      setChatError(error.message)
      throw error
    } finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) refreshConversations().catch(() => setConversations([]))
    else setConversations([])
  }, [user?.id, refreshConversations])

  useEffect(() => {
    if (!user?.id) return undefined
    const socket = getSocket()
    if (!socket) return undefined
    const onMessage = (message) => {
      const normalized = normalizeMessage(message, user.id)
      if (!conversations.some((item) => item.id === message.conversation_id)) {
        refreshConversations().catch(() => {})
        return
      }
      setConversations((previous) => {
        const index = previous.findIndex((item) => item.id === message.conversation_id)
        if (index < 0) return previous
        return previous.map((item, itemIndex) => itemIndex === index ? {
          ...item,
          messages: item.messages.some((existing) => existing.id === normalized.id)
            ? item.messages
            : [...item.messages, normalized],
          unread: item.unread + 1,
        } : item)
      })
    }
    const onTyping = ({ conversationId, isTyping, isRecording }) => setTyping((previous) => ({ ...previous, [conversationId]: isRecording ? 'recording' : (isTyping ? 'typing' : null) }))
    const onPresence = ({ userId: changedUserId, status, lastSeen }) => setConversations((previous) => previous.map((item) => item.participantId === changedUserId ? { ...item, participant: { ...item.participant, isOnline: status === 'online', lastSeen: lastSeen || item.participant.lastSeen } } : item))
    socket.on('chat:message', onMessage)
    socket.on('message:typing', onTyping)
    socket.on('presence:update', onPresence)
    return () => { socket.off('chat:message', onMessage); socket.off('message:typing', onTyping); socket.off('presence:update', onPresence) }
  }, [user?.id, conversations, refreshConversations])

  const getConversation = useCallback((id) => conversations.find((item) => item.id === id) || null, [conversations])
  const findUser = useCallback((id) => conversations.find((item) => item.participantId === id)?.participant || null, [conversations])

  const findOrCreateConversation = useCallback(async (userId) => {
    const existing = conversations.find((item) => item.participantId === userId)
    if (existing) return existing
    const data = await chatService.openConversation(userId)
    await refreshConversations()
    return { id: data.conversation.id, participantId: userId, messages: [], messagesLoaded: false }
  }, [conversations, refreshConversations])

  const loadConversationMessages = useCallback(async (conversationId, { force = false } = {}) => {
    getSocket()?.emit('conversation:join', { conversationId })
    const existing = conversations.find((item) => item.id === conversationId)
    if (existing?.messagesLoaded && !force) return existing.messages
    const rows = await chatService.listMessages(conversationId)
    const messages = rows.map((row) => normalizeMessage(row, user?.id))
    setConversations((previous) => previous.map((item) => item.id === conversationId
      ? { ...item, messages, messagesLoaded: true, unread: 0 }
      : item))
    return messages
  }, [conversations, user?.id])

  const setTypingStatus = useCallback((conversationId, isTyping, isRecording = false) => {
    getSocket()?.emit('message:typing', { conversationId, isTyping, isRecording })
  }, [])

  const sendMessage = useCallback(async (conversationId, payload) => {
    if (payload.type === 'image' || payload.type === 'video') {
      const local = { id: `local-${Date.now()}`, senderId: 'me', type: payload.type, mediaUrl: payload.mediaUrl, time: new Date().toISOString(), status: 'sent' }
      setConversations((previous) => previous.map((item) => item.id === conversationId ? { ...item, messages: [...item.messages, local] } : item))
      return local
    }
    const optimisticId = `sending-${Date.now()}`
    const optimistic = { id: optimisticId, senderId: 'me', type: payload.type || 'text', text: payload.text, time: new Date().toISOString(), status: 'sending' }
    setConversations((previous) => previous.map((item) => item.id === conversationId ? { ...item, messages: [...item.messages, optimistic], messagesLoaded: true } : item))
    try {
      const created = await chatService.sendMessage(conversationId, { text: payload.text, replyToId: payload.replyTo })
      const normalized = normalizeMessage(created, user?.id)
      setConversations((previous) => previous.map((item) => item.id === conversationId
        ? { ...item, messages: item.messages.map((message) => message.id === optimisticId ? normalized : message) }
        : item))
      return normalized
    } catch (error) {
      setConversations((previous) => previous.map((item) => item.id === conversationId
        ? { ...item, messages: item.messages.map((message) => message.id === optimisticId ? { ...message, status: 'blocked', flagged: true, flagReason: error.message } : message) }
        : item))
      throw error
    }
  }, [user?.id])

  const markAsRead = useCallback((conversationId) => {
    setConversations((previous) => previous.map((item) => item.id === conversationId ? { ...item, unread: 0 } : item))
    markConversationNotificationsRead(conversationId)
    chatService.markRead(conversationId).catch(() => {})
  }, [markConversationNotificationsRead])

  const touch = useCallback((conversationId, update) => setConversations((previous) => previous.map((item) => item.id === conversationId ? update(item) : item)), [])
  const deleteMessage = useCallback((conversationId, messageId) => touch(conversationId, (item) => ({ ...item, messages: item.messages.filter((message) => message.id !== messageId) })), [touch])
  const deleteConversation = useCallback((conversationId) => setConversations((previous) => previous.filter((item) => item.id !== conversationId)), [])
  const togglePin = useCallback((conversationId) => touch(conversationId, (item) => ({ ...item, pinned: !item.pinned })), [touch])
  const toggleArchive = useCallback((conversationId) => touch(conversationId, (item) => ({ ...item, archived: !item.archived })), [touch])

  const shareContent = useCallback(async (recipientIds, shared) => Promise.all(recipientIds.map(async (recipientId) => {
    const conversation = await findOrCreateConversation(recipientId)
    await sendMessage(conversation.id, { type: 'text', text: `Shared ${shared.kind || 'post'}: ${shared.title || shared.id}` })
    return conversation.id
  })), [findOrCreateConversation, sendMessage])
  const forwardMessage = useCallback((message, recipientIds) => shareContent(recipientIds, { kind: 'message', title: message.text || 'Forwarded message' }), [shareContent])

  const unreadCount = useMemo(() => conversations.filter((item) => !item.archived).reduce((sum, item) => sum + item.unread, 0), [conversations])

  return <ChatContext.Provider value={{
    conversations, typing, loading, chatError, unreadCount, getConversation, findUser,
    findOrCreateConversation, loadConversationMessages, refreshConversations,
    sendMessage, deleteMessage, deleteConversation, togglePin, toggleArchive,
    markAsRead, shareContent, forwardMessage, setTypingStatus,
  }}>{children}</ChatContext.Provider>
}

export const useChat = () => useContext(ChatContext)
