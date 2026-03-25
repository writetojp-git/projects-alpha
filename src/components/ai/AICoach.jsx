import { useState, useEffect, useRef } from 'react'
import { Bot, Send, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function AICoach({ project, userProfile, completion }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // { role, content, id? }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Load conversation history from Supabase when panel first opens
  useEffect(() => {
    if (!open || historyLoaded) return
    const load = async () => {
      const { data } = await supabase
        .from('ai_conversations')
        .select('id, role, content, created_at')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true })
        .limit(40)
      if (data?.length) setMessages(data.map(r => ({ id: r.id, role: r.role, content: r.content })))
      setHistoryLoaded(true)
    }
    load()
  }, [open, project.id, historyLoaded])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [messages, open])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      // Save user message to Supabase
      const { data: savedUser } = await supabase
        .from('ai_conversations')
        .insert({
          company_id: userProfile.company_id,
          project_id: project.id,
          user_id: userProfile.id,
          role: 'user',
          content: text,
        })
        .select('id')
        .single()

      // Call AI Coach API
      const res = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          project: {
            name: project.name,
            type: project.type,
            phase: project.phase,
            status: project.status,
            health: project.health,
            description: project.description,
            completion,
          },
          history: messages.slice(-10),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'AI error')

      const assistantMsg = { role: 'assistant', content: data.reply }
      setMessages(prev => [...prev, assistantMsg])

      // Save assistant message to Supabase
      await supabase.from('ai_conversations').insert({
        company_id: userProfile.company_id,
        project_id: project.id,
        user_id: userProfile.id,
        role: 'assistant',
        content: data.reply,
      })
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Sorry, I encountered an error: ${err.message}. Please try again.` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = async () => {
    if (!confirm('Clear this project\'s AI Coach conversation history?')) return
    await supabase
      .from('ai_conversations')
      .delete()
      .eq('project_id', project.id)
      .eq('user_id', userProfile.id)
    setMessages([])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const suggestions = [
    `What should I focus on in the ${project.phase || 'Define'} phase?`,
    'Help me write a problem statement',
    'What are the key risks for this project?',
    'Explain the tools I should use now',
  ]

  return (
    <div className="card overflow-hidden p-0">
      {/* Toggle Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-7 h-7 bg-brand-orange/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Bot size={15} className="text-brand-orange" />
        </div>
        <div className="flex-1">
          <span className="font-bold text-brand-charcoal-dark text-sm">AI Coach</span>
          <span className="text-xs text-brand-charcoal ml-2">
            {messages.length > 0 ? `${messages.length} messages` : 'Ask anything about this project'}
          </span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {/* Messages */}
          <div className="h-80 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50">
            {messages.length === 0 && !loading && (
              <div className="pt-4">
                <p className="text-xs text-brand-charcoal text-center mb-4">
                  I have context on <strong>{project.name}</strong> ({(project.type || 'dmaic').toUpperCase()}, {project.phase || 'Define'} phase).
                  Ask me anything.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50) }}
                      className="text-left text-xs text-brand-charcoal bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-brand-orange/40 hover:bg-brand-orange/5 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 bg-brand-orange/10 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                    <Bot size={12} className="text-brand-orange" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-brand-orange text-white rounded-tr-sm'
                      : 'bg-white border border-gray-200 text-brand-charcoal-dark rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 bg-brand-orange/10 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <Bot size={12} className="text-brand-orange" />
                </div>
                <div className="bg-white border border-gray-200 rounded-xl rounded-tl-sm px-3.5 py-2.5 shadow-sm">
                  <Loader2 size={14} className="animate-spin text-brand-orange" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask the AI Coach… (Enter to send, Shift+Enter for new line)"
              className="flex-1 input text-sm resize-none py-2 min-h-[36px] max-h-28"
              style={{ height: Math.min(112, Math.max(36, input.split('\n').length * 22)) + 'px' }}
              disabled={loading}
            />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {messages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded"
                  title="Clear conversation"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center hover:bg-brand-orange-dark transition-colors disabled:opacity-40"
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
