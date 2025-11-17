import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Send, Mic, Image, Volume2, Trash2, LogOut, ChevronDown, MicOff, X } from 'lucide-react'
import { getModels, streamChat, type OpenRouterMessage, type OpenRouterModel } from '../api/openrouter'

interface ChatProps {
  token: string
  onLogout: () => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: OpenRouterMessage['content']
  timestamp: Date
}

const Chat: React.FC<ChatProps> = ({ token, onLogout }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const [currentModel, setCurrentModel] = useState('')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  // Add state for TTS
  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentAssistantId = useRef<string | null>(null)

  useEffect(() => {
    fetchModels()
  }, [token])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchModels = async () => {
    try {
      setModelsLoading(true)
      const fetchedModels = await getModels(token)
      setModels(fetchedModels)
      if (fetchedModels.length > 0) {
        setCurrentModel(fetchedModels[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
    } finally {
      setModelsLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && !pendingImage) || isLoading || !currentModel) return

    let userContent: OpenRouterMessage['content'] = input.trim()
    if (pendingImage) {
      const parts: Array<any> = []
      if (input.trim()) {
        parts.push({ type: 'text', text: input.trim() })
      }
      parts.push({ type: 'image_url', image_url: { url: pendingImage } })
      userContent = parts
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setPendingImage(null)
    setIsLoading(true)

    const apiMessages: OpenRouterMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      ...messages.map(m => ({ role: m.role, content: m.content } as OpenRouterMessage)),
      { role: 'user', content: userMessage.content }
    ]

    abortControllerRef.current = new AbortController()

    const assistantId = (Date.now() + 1).toString()
    currentAssistantId.current = assistantId

    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      for await (const chunk of streamChat(token, apiMessages, { model: currentModel, abortSignal: abortControllerRef.current!.signal })) {
        setMessages(prev => prev.map(msg =>
          msg.id === currentAssistantId.current
            ? { ...msg, content: (msg.content as string) + chunk }
            : msg
        ))
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => prev.map(msg =>
        msg.id === currentAssistantId.current
          ? { ...msg, content: (msg.content as string) || 'Error: ' + (error as Error).message }
          : msg
      ))
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
      currentAssistantId.current = null
    }
  }, [input, isLoading, currentModel, messages, token, pendingImage])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser')
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'  // or detect lang

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(transcript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPendingImage(ev.target?.result as string)
      }
      reader.readAsDataURL(file)
      e.target.value = ''
    }
  }, [])

  // speak function
  const speakMessage = useCallback((content: OpenRouterMessage['content']) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      utteranceRef.current = null
      return
    }

    let speakableText: string
    if (typeof content === 'string') {
      speakableText = content
    } else if (Array.isArray(content)) {
      speakableText = content
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join(' ')
    } else {
      return
    }

    if (!speakableText.trim()) return

    const utterance = new SpeechSynthesisUtterance(speakableText)
    utterance.lang = 'en-US'
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onend = () => {
      setIsSpeaking(false)
      utteranceRef.current = null
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
      utteranceRef.current = null
    }

    window.speechSynthesis.speak(utterance)
    utteranceRef.current = utterance
    setIsSpeaking(true)
  }, [isSpeaking])

  const renderContent = (content: OpenRouterMessage['content']) => {
    if (typeof content === 'string') {
      return <p className="whitespace-pre-wrap">{content}</p>
    }
    if (!Array.isArray(content)) return null
    return (
      <div className="space-y-3">
        {content.map((part, index) => (
          <div key={index}>
            {part.type === 'text' && part.text && (
              <p className="whitespace-pre-wrap">{part.text}</p>
            )}
            {part.type === 'image_url' && part.image_url?.url && (
              <img
                src={part.image_url.url}
                alt={`Uploaded image ${index + 1}`}
                className="max-w-full h-auto rounded-xl my-2 shadow-lg max-h-80 object-contain border border-slate-600"
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-8 w-8 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              OpenRouter Chat
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              {modelsLoading ? (
                <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
              ) : (
                <>
                  <span>{currentModel.split('/').pop()}</span>
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors"
            title="Clear chat"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-red-600/50 rounded-xl transition-colors text-red-400 hover:text-red-300"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 flex flex-col items-center justify-center h-full">
            <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg">Start a conversation</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 text-white'
                } ${message.role === 'assistant' ? 'rounded-tl-2xl' : 'rounded-tr-2xl'}`}
              >
                <div className="flex flex-col">
                  {renderContent(message.content)}
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => speakMessage(message.content)}
                        className={`ml-2 p-1 rounded-full hover:bg-slate-700/50 transition-colors flex-shrink-0 ${isSpeaking ? 'text-orange-400 animate-pulse' : 'text-slate-400 hover:text-white'}`}
                        title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-2 opacity-75">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl rounded-tl-2xl max-w-3xl">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Model Selector Overlay - simplified dropdown */}
      {models.length > 0 && !modelsLoading && (
        <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-xl p-2 shadow-2xl min-w-[200px] z-50">
          <select
            value={currentModel}
            onChange={(e) => setCurrentModel(e.target.value)}
            className="w-full bg-transparent border-none text-white font-medium focus:outline-none p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            {models.slice(0, 20).map((model) => ( // limit to top 20
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Input */}
      <div className="bg-slate-800/50 backdrop-blur-xl border-t border-slate-700/50 p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          {pendingImage && (
            <div className="flex justify-start bg-slate-700/80 border-2 border-dashed border-slate-600 rounded-2xl p-4">
              <img
                src={pendingImage}
                alt="Selected image"
                className="max-w-full h-auto rounded-xl max-h-48 object-contain flex-1"
              />
              <button
                onClick={() => setPendingImage(null)}
                className="ml-3 self-start p-2 bg-red-600/80 hover:bg-red-700 text-white rounded-xl transition-colors flex-shrink-0"
                title="Remove image"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={pendingImage ? "Describe the image (optional)..." : "Type your message... (Shift+Enter for new line)"}
              className="flex-1 min-h-[44px] max-h-32 resize-none bg-slate-700/80 border border-slate-600 rounded-2xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 text-lg"
              disabled={isLoading}
              rows={1}
            />
            <button
              onClick={toggleListening}
              disabled={isLoading}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse shadow-2xl shadow-red-500/25' : 'bg-slate-700/50 hover:bg-slate-600 text-slate-400 hover:text-white'}`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-12 h-12 bg-slate-700/50 hover:bg-slate-600 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center"
              title="Upload image"
            >
              <Image className="h-6 w-6" />
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() && !pendingImage || isLoading}
              className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <div className="flex justify-center mt-3 text-xs text-slate-500 gap-4">
            <span>Mic • Image • Voice soon</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat
