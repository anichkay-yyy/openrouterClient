import { useState, useEffect } from 'react'
import Auth from './components/Auth'
import Chat from './components/Chat'
import './App.css'

function App() {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const savedToken = localStorage.getItem('openrouter-token')
    if (savedToken) {
      setToken(savedToken)
    }
  }, [])

  const handleAuth = (newToken: string) => {
    localStorage.setItem('openrouter-token', newToken)
    setToken(newToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('openrouter-token')
    setToken(null)
  }

  if (!token) {
    return <Auth onAuth={handleAuth} />
  }

  return <Chat token={token} onLogout={handleLogout} />
}

export default App
