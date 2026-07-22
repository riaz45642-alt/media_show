import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { SEED_CONVERSATIONS, CANNED_REPLIES, nextMessageId, findUser } from '../data/messages'
import { AI_ASSISTANT_ID } from '../data/users'
import { moderateContent } from '../services/moderationService'
import { askSafeZoneAI } from '../services/aiChatService'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [conversations, setConversations] = useState(SEED_CONVERSATIONS)
  // { [conversationId]: true } while the other participant is "typing"
  const [typing, setTyping] = useState({})
  const timers = useRef([])

  const clearLater = (fn, ms) => {
    const t = setTimeout(fn, ms)
    timers.current.push(t)
    return t
  }

  const getConversation = useCallback(
    (id) => conversations.find((c) => c.id === id) || null,
    [conversations]
  )

  const findOrCreateConversation = useCallback(
    (userId) => {
      let convo = conversations.find((c) => c.participantId === userId)
      if (!convo) {
        convo = { id: userId, participantId: userId, pinned: false, archived: false, messages: [] }
        setConversations((prev) => [convo, ...prev])
      }
      return convo
    },
    [conversations]
  )

  const touchConversation = (id, updater) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c)))
  }

  // Simulates the other participant seeing + responding to a message, purely
  // for demo purposes (no real backend/socket wired up yet).
  const simulateReply = (conversationId) => {
    setTyping((prev) => ({ ...prev, [conversationId]: false }))
    // mark my most recent messages as seen
    clearLater(() => {
      touchConversation(conversationId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.senderId === 'me' ? { ...m, status: 'seen' } : m)),
      }))
      setTyping((prev) => ({ ...prev, [conversationId]: true }))
    }, 700)

    clearLater(() => {
      setTyping((prev) => ({ ...prev, [conversationId]: false }))
      touchConversation(conversationId, (c) => {
        const reply = CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)]
        return {
          ...c,
          messages: [
            ...c.messages,
            { id: nextMessageId(), senderId: c.participantId, type: 'text', text: reply, time: new Date().toISOString(), status: 'delivered' },
          ],
        }
      })
    }, 2100)
  }

  const askAIAssistant = (conversationId, userText) => {
    setTyping((prev) => ({ ...prev, [conversationId]: true }))
    const convo = conversations.find((c) => c.id === conversationId)
    const history = (convo?.messages || [])
      .slice(-8)
      .map((m) => ({ role: m.senderId === 'me' ? 'user' : 'assistant', text: m.text }))

    askSafeZoneAI(userText, history).then((reply) => {
      setTyping((prev) => ({ ...prev, [conversationId]: false }))
      touchConversation(conversationId, (c) => ({
        ...c,
        messages: [
          ...c.messages,
          { id: nextMessageId(), senderId: AI_ASSISTANT_ID, type: 'text', text: reply, time: new Date().toISOString(), status: 'delivered' },
        ],
      }))
    })
  }

  const sendMessage = useCallback((conversationId, payload) => {
    const isAIConvo = conversationId === AI_ASSISTANT_ID

    const message = {
      id: nextMessageId(),
      senderId: 'me',
      type: payload.type || 'text',
      text: payload.text || '',
      mediaUrl: payload.mediaUrl || null,
      shared: payload.shared || null,
      replyTo: payload.replyTo || null,
      time: new Date().toISOString(),
      status: 'sending',
      flagged: false,
    }

    touchConversation(conversationId, (c) => ({ ...c, messages: [...c.messages, message] }))

    // Every outgoing text message is checked against the same hybrid
    // moderation pipeline used for posts/comments (rule-based + Gemini AI +
    // risk scoring) before it's marked as actually sent.
    const textToCheck = message.type === 'text' ? message.text : ''
    moderateContent({ text: textToCheck, contentType: 'message' }).then((result) => {
      if (textToCheck && !result.safe) {
        touchConversation(conversationId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === message.id ? { ...m, status: 'blocked', flagged: true, flagReason: result.textResult?.flags?.[0] } : m
          ),
        }))
        return
      }

      touchConversation(conversationId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === message.id ? { ...m, status: 'sent' } : m)),
      }))
      clearLater(() => {
        touchConversation(conversationId, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === message.id ? { ...m, status: 'delivered' } : m)),
        }))
      }, 500)

      if (isAIConvo) {
        askAIAssistant(conversationId, textToCheck)
      } else {
        simulateReply(conversationId)
      }
    })

    return message
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations])

  const deleteMessage = useCallback((conversationId, messageId) => {
    touchConversation(conversationId, (c) => ({
      ...c,
      messages: c.messages.filter((m) => m.id !== messageId),
    }))
  }, [])

  const deleteConversation = useCallback((conversationId) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId))
  }, [])

  const togglePin = useCallback((conversationId) => {
    touchConversation(conversationId, (c) => ({ ...c, pinned: !c.pinned }))
  }, [])

  const toggleArchive = useCallback((conversationId) => {
    touchConversation(conversationId, (c) => ({ ...c, archived: !c.archived }))
  }, [])

  const markAsRead = useCallback((conversationId) => {
    touchConversation(conversationId, (c) => ({
      ...c,
      messages: c.messages.map((m) => (m.senderId !== 'me' ? { ...m, status: 'seen' } : m)),
    }))
  }, [])

  // Shares one piece of content (post/reel/video/story/profile/link) with one
  // or more recipients, creating conversations as needed. Returns the ids of
  // the conversations that were messaged, so the UI can confirm + deep-link.
  const shareContent = useCallback((recipientIds, shared) => {
    const touchedIds = []
    setConversations((prev) => {
      let next = [...prev]
      recipientIds.forEach((userId) => {
        let convo = next.find((c) => c.participantId === userId)
        const message = {
          id: nextMessageId(),
          senderId: 'me',
          type: 'shared',
          shared,
          text: '',
          time: new Date().toISOString(),
          status: 'sent',
        }
        if (!convo) {
          convo = { id: userId, participantId: userId, pinned: false, archived: false, messages: [message] }
          next = [convo, ...next]
        } else {
          next = next.map((c) => (c.id === convo.id ? { ...c, messages: [...c.messages, message] } : c))
        }
        touchedIds.push(convo.id)
      })
      return next
    })
    touchedIds.forEach((id) => clearLater(() => simulateReply(id), 900))
    return touchedIds
  }, [])

  // Forwards an existing message (text/image/video/shared) to one or more
  // recipients, preserving its content but marking it as forwarded.
  const forwardMessage = useCallback((message, recipientIds) => {
    const touchedIds = []
    setConversations((prev) => {
      let next = [...prev]
      recipientIds.forEach((userId) => {
        let convo = next.find((c) => c.participantId === userId)
        const newMessage = {
          id: nextMessageId(),
          senderId: 'me',
          type: message.type,
          text: message.text || '',
          mediaUrl: message.mediaUrl || null,
          shared: message.shared || null,
          forwarded: true,
          time: new Date().toISOString(),
          status: 'sent',
        }
        if (!convo) {
          convo = { id: userId, participantId: userId, pinned: false, archived: false, messages: [newMessage] }
          next = [convo, ...next]
        } else {
          next = next.map((c) => (c.id === convo.id ? { ...c, messages: [...c.messages, newMessage] } : c))
        }
        touchedIds.push(convo.id)
      })
      return next
    })
    touchedIds.forEach((id) => clearLater(() => simulateReply(id), 900))
    return touchedIds
  }, [])

  const unreadCount = useMemo(
    () =>
      conversations
        .filter((c) => !c.archived)
        .reduce((sum, c) => sum + c.messages.filter((m) => m.senderId !== 'me' && m.status !== 'seen').length, 0),
    [conversations]
  )

  const value = {
    conversations,
    typing,
    unreadCount,
    getConversation,
    findOrCreateConversation,
    sendMessage,
    deleteMessage,
    deleteConversation,
    togglePin,
    toggleArchive,
    markAsRead,
    shareContent,
    forwardMessage,
    findUser,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export const useChat = () => useContext(ChatContext)
