import { useState } from 'react'
import { Key, Send } from 'lucide-react'

interface AuthProps {
  onAuth: (token: string) => void
}

const Auth = ({ onAuth }: AuthProps) => {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) {
      setError('Please enter your OpenRouter API token')
      return
    }
    setError('')
    setLoading(true)
    // Simulate API check or direct auth
    setTimeout(() => {
      onAuth(token.trim())
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-slate-700/50">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            OpenRouter
          </h1>
          <p className="text-xl text-slate-400">Enter your API token to start chatting</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              OpenRouter API Token
            </label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="or_sk-..."
                className="w-full pl-12 pr-4 py-4 bg-slate-700/80 border border-slate-600 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 text-lg"
                disabled={loading}
              />
            </div>
            {error && (
              <p className="mt-2 text-red-400 text-sm">{error}</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!token.trim() || loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 text-white py-4 px-8 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <>
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Connect
              </>
            )}
          </button>
        </form>
        
        <p className="mt-8 text-center text-sm text-slate-500">
          Get your token at{' '}
          <a 
            href="https://openrouter.ai/keys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 font-medium underline"
          >
            openrouter.ai/keys
          </a>
        </p>
      </div>
    </div>
  )
}

export default Auth
