import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, User, Send, ArrowLeft, Phone, Car, ChevronRight,
  MessageSquare, Search, CheckCheck, Check,
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Avatar, Badge, Button, EmptyState } from '@/components/ui'
import { formatRelativeDate, formatPhone } from '@/utils/format'
import type { Message, Conversation } from '@/types'

const QUICK_REPLIES = [
  "I'll check and get back to you",
  'Let me connect you with our team',
  'Your car is ready for pickup!',
]

const AI_MOCK_REPLIES = [
  'Ji bilkul! Main aapke liye check karta hoon aur detail bhejta hoon.',
  'Aapka booking confirm ho gaya hai. Studio visit ke time pe documents le aana. 🙏',
  'Thank you! Humari team jaldi se aapse connect karegi.',
  'Aapki car ka kaam progress mein hai — quality check ke baad update dunga.',
]

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 px-4">
      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-indigo-600" />
      </div>
      <div className="bg-indigo-50 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ message }: { message: Message }) {
  const isCustomer = message.sender === 'customer'
  const isAi = message.sender === 'ai'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 px-4 ${isCustomer ? 'justify-start' : 'justify-end'}`}
    >
      {isCustomer && (
        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
          <User size={14} className="text-slate-600" />
        </div>
      )}
      <div className={`max-w-[75%] space-y-1 ${isCustomer ? '' : 'flex flex-col items-end'}`}>
        {!isCustomer && (
          <span className="text-[10px] font-medium text-slate-400 px-1">
            {isAi ? '🤖 Movo AI' : '👤 You'}
          </span>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isCustomer
              ? 'bg-slate-100 text-slate-800 rounded-bl-md'
              : isAi
              ? 'bg-indigo-50 text-slate-800 rounded-br-md'
              : 'bg-white border border-slate-200 text-slate-800 rounded-br-md'
          }`}
        >
          {message.content}
        </div>
        <div className={`flex items-center gap-1 px-1 ${isCustomer ? '' : 'flex-row-reverse'}`}>
          <span className="text-[10px] text-slate-400">
            {formatRelativeDate(message.timestamp)}
          </span>
          {!isCustomer && (
            message.read
              ? <CheckCheck size={12} className="text-indigo-500" />
              : <Check size={12} className="text-slate-400" />
          )}
        </div>
      </div>
      {!isCustomer && (
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            isAi ? 'bg-indigo-100' : 'bg-amber-100'
          }`}
        >
          {isAi ? (
            <Bot size={14} className="text-indigo-600" />
          ) : (
            <User size={14} className="text-amber-600" />
          )}
        </div>
      )}
    </motion.div>
  )
}

export default function AIReceptionist() {
  const { conversations, customers, vehicles, toggleAiHandling, addMessage, getCustomer, getVehiclesForCustomer } = useApp()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [typing, setTyping] = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  const allMessages = useMemo(() => {
    if (!selected) return []
    return selected.messages
  }, [selected])

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

    const newMsg: Message = {
      id: `msg-local-${Date.now()}`,
      content,
      sender: selected.aiHandling ? 'ai' : 'human',
      timestamp: new Date().toISOString(),
      read: false,
    }

    addMessage(selected.id, newMsg)
    setInputValue('')

    if (selected.aiHandling) {
      setTyping(true)
      setTimeout(() => {
        const reply: Message = {
          id: `msg-ai-${Date.now()}`,
          content: AI_MOCK_REPLIES[Math.floor(Math.random() * AI_MOCK_REPLIES.length)],
          sender: 'customer',
          timestamp: new Date().toISOString(),
          read: true,
        }
        addMessage(selected.id, reply)
        setTyping(false)
      }, 1500)
    }
  }

  function getCustomerVehicle(customerId: string) {
    const vehs = getVehiclesForCustomer(customerId)
    if (vehs.length === 0) return null
    return vehs[0]
  }

  function ConversationList() {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-slate-900">AI Receptionist</h1>
            <Badge variant="primary" dot>
              <Bot size={12} /> Active
            </Badge>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
            <span>{conversations.length} conversations</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-emerald-600 font-medium">{aiHandlingCount} AI handling</span>
            {needAttentionCount > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-amber-600 font-medium">{needAttentionCount} need attention</span>
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
                className={`w-full text-left px-4 py-3 border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                  isActive ? 'bg-indigo-50/60 border-l-2 border-l-indigo-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar name={customer.name} size="md" />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        conv.aiHandling ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {customer.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                        {lastMsg ? formatRelativeDate(lastMsg.timestamp) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="mt-1 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold shrink-0">
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

  function ChatView() {
    if (!selected) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-50/50">
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
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileShowChat(false)}
                className="lg:hidden p-1 -ml-1 text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar name={customer.name} size="md" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{customer.name}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone size={10} />
                  <span>{formatPhone(customer.phone)}</span>
                  {vehicle && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <Car size={10} />
                      <span>{vehicle.make} {vehicle.model}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* AI/Human toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAiHandling(selected.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selected.aiHandling
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
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
              </div>
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 bg-slate-50/30">
          <AnimatePresence mode="popLayout">
            {allMessages.map(msg => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>
          {typing && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* AI handling banner */}
        {selected.aiHandling && (
          <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-700">
              <Bot size={14} />
              <span>AI is handling this conversation</span>
            </div>
            <button
              onClick={() => toggleAiHandling(selected.id)}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline"
            >
              Switch to human mode
            </button>
          </div>
        )}

        {/* Quick replies */}
        <div className="px-4 py-2 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {QUICK_REPLIES.map(reply => (
              <button
                key={reply}
                onClick={() => handleSend(reply)}
                className="shrink-0 px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Conversation list — hidden on mobile when chat is open */}
      <div className={`w-80 border-r border-slate-200 shrink-0 ${mobileShowChat ? 'hidden lg:flex lg:flex-col' : 'flex flex-col w-full lg:w-80'}`}>
        <ConversationList />
      </div>

      {/* Chat panel — hidden on mobile when list is showing */}
      <div className={`flex-1 flex flex-col ${mobileShowChat ? 'flex' : 'hidden lg:flex'}`}>
        <ChatView />
      </div>
    </div>
  )
}
