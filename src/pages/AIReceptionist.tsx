import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, User, Send, ArrowLeft, Phone, Car, ChevronRight,
  MessageSquare, Search, CheckCheck, Check, Plus, Archive, X, Wifi, WifiOff,
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Avatar, Badge, Button, Modal, EmptyState } from '@/components/ui'
import { formatRelativeDate, formatPhone } from '@/utils/format'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import type { Message } from '@/types'
import { useWebSocket } from '@/hooks/useWebSocket'
import { apiWaSend, apiWaStatus } from '@/api/endpoints'

// ---------------------------------------------------------------------------
// Contextual quick-reply suggestions
// ---------------------------------------------------------------------------
const QUICK_REPLIES = [
  'View our pricing',
  'Book an appointment',
  'Ceramic coating details',
  'PPF packages',
  'Check availability',
]

// ---------------------------------------------------------------------------
// Date header helper -- groups messages by date
// ---------------------------------------------------------------------------
function formatDateHeader(timestamp: string): string {
  const d = parseISO(timestamp)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE, MMM d, yyyy')
}

function formatMessageTime(timestamp: string): string {
  const d = parseISO(timestamp)
  return format(d, 'h:mm a')
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 px-4">
      <div className="w-7 h-7 rounded-full bg-[#6366f1]/15 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-[#6366f1]" />
      </div>
      <div className="bg-[#6366f1]/10 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 bg-[#818cf8] rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ message, showTime }: { message: Message; showTime: boolean }) {
  const isCustomer = message.sender === 'customer'
  const isAi = message.sender === 'ai'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 px-4 ${isCustomer ? 'justify-start' : 'justify-end'}`}
    >
      {isCustomer && (
        <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
          <User size={14} className="text-white/60" />
        </div>
      )}
      <div className={`max-w-[75%] space-y-1 ${isCustomer ? '' : 'flex flex-col items-end'}`}>
        {!isCustomer && (
          <span className="text-[10px] font-medium text-white/30 px-1">
            {isAi ? 'Movo AI' : 'You'}
          </span>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isCustomer
              ? 'bg-white/[0.04] text-white/90 rounded-bl-md'
              : isAi
              ? 'bg-[#6366f1]/10 text-white/90 rounded-br-md'
              : 'bg-white/[0.04] border border-white/[0.06] text-white/90 rounded-br-md'
          }`}
        >
          {message.content}
        </div>
        <div className={`flex items-center gap-1 px-1 ${isCustomer ? '' : 'flex-row-reverse'}`}>
          {showTime && (
            <span className="text-[10px] text-white/30">
              {formatMessageTime(message.timestamp)}
            </span>
          )}
          {!isCustomer && (
            message.read
              ? <CheckCheck size={12} className="text-[#818cf8]" />
              : <Check size={12} className="text-white/30" />
          )}
        </div>
      </div>
      {!isCustomer && (
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            isAi ? 'bg-[#6366f1]/15' : 'bg-amber-500/10'
          }`}
        >
          {isAi ? (
            <Bot size={14} className="text-[#6366f1]" />
          ) : (
            <User size={14} className="text-amber-400" />
          )}
        </div>
      )}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AIReceptionist() {
  const {
    conversations, customers, services, toggleAiHandling, addMessage,
    addConversation, archiveConversation, getCustomer, getVehiclesForCustomer, currentTenant,
    setConversations,
  } = useApp()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [typing, setTyping] = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newConvoCustomerId, setNewConvoCustomerId] = useState('')
  const [newConvoSearch, setNewConvoSearch] = useState('')
  const [waConnected, setWaConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check WhatsApp status on mount
  useEffect(() => {
    apiWaStatus().then(s => setWaConnected(s.connected)).catch(() => {})
  }, [])

  // WebSocket for real-time message updates
  useWebSocket({
    onNewMessage: ({ conversationId, message }) => {
      setConversations((prev: any[]) => prev.map((c: any) => {
        if (c.id !== conversationId) return c
        return {
          ...c,
          messages: [...c.messages, message],
          lastMessage: message.content,
          unreadCount: message.sender === 'customer' ? c.unreadCount + 1 : c.unreadCount,
        }
      }))
    },
    onWaStatus: (data) => {
      setWaConnected(data.connected)
    },
  })

  const selected = conversations.find(c => c.id === selectedId)

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter(c => {
      const customer = getCustomer(c.customerId)
      return customer?.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)
    })
  }, [conversations, searchQuery, getCustomer])

  const aiHandlingCount = conversations.filter(c => c.aiHandling).length
  const needAttentionCount = conversations.filter(c => !c.aiHandling && c.unreadCount > 0).length

  // Customers who don't already have a conversation (for the "new" modal)
  const availableCustomers = useMemo(() => {
    const existingIds = new Set(conversations.map(c => c.customerId))
    const all = customers.filter(c => !existingIds.has(c.id))
    if (!newConvoSearch.trim()) return all
    const q = newConvoSearch.toLowerCase()
    return all.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(newConvoSearch))
  }, [customers, conversations, newConvoSearch])

  const allMessages = useMemo(() => {
    if (!selected) return []
    return selected.messages
  }, [selected])

  // Group messages by date for date headers
  const messageGroups = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = []
    for (const msg of allMessages) {
      const dateKey = formatDateHeader(msg.timestamp)
      const last = groups[groups.length - 1]
      if (last && last.date === dateKey) {
        last.messages.push(msg)
      } else {
        groups.push({ date: dateKey, messages: [msg] })
      }
    }
    return groups
  }, [allMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages, typing])

  function handleSelectConversation(id: string) {
    setSelectedId(id)
    setMobileShowChat(true)
    setInputValue('')
  }

  function handleSend(text?: string) {
    const content = text || inputValue.trim()
    if (!content || !selected) return

    const customer = getCustomer(selected.customerId)

    // Staff always sends as 'human'
    const newMsg: Message = {
      id: `msg-local-${Date.now()}`,
      content,
      sender: 'human',
      timestamp: new Date().toISOString(),
      read: false,
    }

    addMessage(selected.id, newMsg)
    setInputValue('')

    // Also send via WhatsApp if connected and customer has a phone number
    if (customer?.phone) {
      apiWaSend(customer.phone, content).catch(() => {
        // Silently fail — message is still saved in the conversation
      })
    }

    // AI handling is now done server-side via Claude API.
    // Incoming WA message -> backend Claude reply -> sent via WA -> pushed via WebSocket.
    // No client-side AI response generation needed.
  }

  async function handleCreateConversation() {
    if (!newConvoCustomerId) return
    const convo = await addConversation(newConvoCustomerId)
    setShowNewModal(false)
    setNewConvoCustomerId('')
    setNewConvoSearch('')
    setSelectedId(convo.id)
    setMobileShowChat(true)
  }

  async function handleArchive() {
    if (!selected) return
    await archiveConversation(selected.id)
    setSelectedId(null)
    setMobileShowChat(false)
  }

  function getCustomerVehicle(customerId: string) {
    const vehs = getVehiclesForCustomer(customerId)
    if (vehs.length === 0) return null
    return vehs[0]
  }

  // ----- Conversation List -----
  function ConversationList() {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-white">AI Receptionist</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#6366f1] rounded-lg hover:bg-[#6366f1]/80 transition-colors"
              >
                <Plus size={14} />
                New
              </button>
              <Badge variant="primary" dot>
                <Bot size={12} /> Active
              </Badge>
            </div>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.04] border border-white/[0.10] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-transparent placeholder-white/30"
            />
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs text-white/40">
            <span>{conversations.length} conversations</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-emerald-400 font-medium">{aiHandlingCount} AI handling</span>
            {needAttentionCount > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-amber-400 font-medium">{needAttentionCount} need attention</span>
              </>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map(conv => {
            const customer = getCustomer(conv.customerId)
            if (!customer) return null
            const isActive = selectedId === conv.id
            const lastMsg = conv.messages[conv.messages.length - 1]

            return (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`w-full text-left px-4 py-3 border-b border-white/[0.04] transition-colors hover:bg-white/[0.04] ${
                  isActive ? 'bg-[#6366f1]/10 border-l-2 border-l-[#6366f1]' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar name={customer.name} size="md" />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#181b25] ${
                        conv.aiHandling ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                        {customer.name}
                        {conv.waJid && (
                          <MessageSquare size={11} className="text-emerald-400 shrink-0" />
                        )}
                      </span>
                      <span className="text-[10px] text-white/30 shrink-0 ml-2">
                        {lastMsg ? formatRelativeDate(lastMsg.timestamp) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 truncate mt-0.5">
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="mt-1 flex items-center justify-center w-5 h-5 rounded-full bg-[#6366f1] text-white text-[10px] font-bold shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ----- Chat View -----
  function ChatView() {
    if (!selected) {
      return (
        <div className="flex-1 flex items-center justify-center bg-white/[0.02]">
          <EmptyState
            icon={<MessageSquare size={48} />}
            title="Select a conversation"
            description="Choose a conversation from the list to view messages"
          />
        </div>
      )
    }

    const customer = getCustomer(selected.customerId)
    if (!customer) return null
    const vehicle = getCustomerVehicle(customer.id)

    return (
      <div className="flex-1 flex flex-col h-full">
        {/* AI / Human handling banner at top of chat */}
        <div
          className={`px-4 py-2 flex items-center justify-between text-xs font-medium border-b ${
            selected.aiHandling
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {selected.aiHandling ? <Bot size={14} /> : <User size={14} />}
            <span>{selected.aiHandling ? 'AI will respond automatically via WhatsApp' : 'You are handling this conversation manually'}</span>
          </div>
          <button
            onClick={() => toggleAiHandling(selected.id)}
            className="underline hover:no-underline"
          >
            {selected.aiHandling ? 'Switch to human' : 'Switch to AI'}
          </button>
        </div>

        {/* Chat header */}
        <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileShowChat(false)}
                className="lg:hidden p-1 -ml-1 text-white/40 hover:text-white/70"
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar name={customer.name} size="md" />
              <div>
                <h2 className="text-sm font-semibold text-white">{customer.name}</h2>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Phone size={10} />
                  <span>{formatPhone(customer.phone)}</span>
                  {vehicle && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <Car size={10} />
                      <span>{vehicle.make} {vehicle.model}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* AI/Human toggle */}
              <button
                onClick={() => toggleAiHandling(selected.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selected.aiHandling
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {selected.aiHandling ? (
                  <>
                    <Bot size={14} />
                    AI Handling
                  </>
                ) : (
                  <>
                    <User size={14} />
                    Human Mode
                  </>
                )}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleArchive}
                icon={<Archive size={14} />}
                className="text-white/30 hover:text-red-400"
              >
                Close
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/customers/${customer.id}`)}
                iconRight={<ChevronRight size={14} />}
              >
                Profile
              </Button>
            </div>
          </div>
        </div>

        {/* Messages grouped by date */}
        <div className="flex-1 overflow-y-auto py-4 space-y-1 bg-white/[0.01]">
          <AnimatePresence mode="popLayout">
            {messageGroups.map(group => (
              <div key={group.date}>
                {/* Date header */}
                <div className="flex items-center justify-center my-3">
                  <span className="px-3 py-1 text-[10px] font-medium text-white/40 bg-white/[0.04] rounded-full">
                    {group.date}
                  </span>
                </div>
                {/* Messages in this date group */}
                <div className="space-y-3">
                  {group.messages.map(msg => (
                    <ChatBubble key={msg.id} message={msg} showTime />
                  ))}
                </div>
              </div>
            ))}
          </AnimatePresence>
          {typing && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick replies */}
        <div className="px-4 py-2 border-t border-white/[0.04] bg-white/[0.02]">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {QUICK_REPLIES.map(reply => (
              <button
                key={reply}
                onClick={() => handleSend(reply)}
                className="shrink-0 px-3 py-1 text-xs font-medium text-white/60 bg-white/[0.04] rounded-full hover:bg-white/[0.06] transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={selected.aiHandling ? 'Type to override AI response...' : 'Type a message...'}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              className="flex-1 px-4 py-2.5 text-sm bg-white/[0.04] border border-white/[0.10] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-transparent placeholder-white/30"
            />
            <Button
              size="md"
              icon={<Send size={16} />}
              onClick={() => handleSend()}
              disabled={!inputValue.trim()}
              className="rounded-xl"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ----- New Conversation Modal -----
  function NewConversationModal() {
    return (
      <Modal
        open={showNewModal}
        onClose={() => { setShowNewModal(false); setNewConvoCustomerId(''); setNewConvoSearch('') }}
        title="New Conversation"
        subtitle="Select a customer to start a conversation"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowNewModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateConversation} disabled={!newConvoCustomerId}>
              Start Conversation
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search customers..."
              value={newConvoSearch}
              onChange={e => setNewConvoSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.04] border border-white/[0.10] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-transparent placeholder-white/30"
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {availableCustomers.length === 0 && (
              <p className="text-sm text-white/30 text-center py-4">No customers available</p>
            )}
            {availableCustomers.map(c => (
              <button
                key={c.id}
                onClick={() => setNewConvoCustomerId(c.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  newConvoCustomerId === c.id
                    ? 'bg-[#6366f1]/10 border border-[#6366f1]/30'
                    : 'hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Avatar name={c.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name}</p>
                  <p className="text-xs text-white/40">{formatPhone(c.phone)}</p>
                </div>
                {newConvoCustomerId === c.id && (
                  <Check size={16} className="text-[#6366f1] shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <>
      {/* WhatsApp connection banner */}
      {!waConnected && (
        <div className="mb-3 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/50">
          <WifiOff size={14} className="shrink-0 text-white/30" />
          <span>Connect WhatsApp in <button onClick={() => navigate('/settings')} className="text-[#818cf8] underline hover:no-underline">Settings</button> to receive real messages</span>
        </div>
      )}

      <div className="h-[calc(100vh-4rem)] flex bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
        {/* Conversation list -- hidden on mobile when chat is open */}
        <div className={`w-80 border-r border-white/[0.06] shrink-0 ${mobileShowChat ? 'hidden lg:flex lg:flex-col' : 'flex flex-col w-full lg:w-80'}`}>
          <ConversationList />
        </div>

        {/* Chat panel -- hidden on mobile when list is showing */}
        <div className={`flex-1 flex flex-col ${mobileShowChat ? 'flex' : 'hidden lg:flex'}`}>
          <ChatView />
        </div>
      </div>

      <NewConversationModal />
    </>
  )
}
