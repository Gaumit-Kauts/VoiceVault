import { useState, useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Feed from './pages/Feed'
import CreatePost from './pages/CreatePost'
import History from './pages/History'
import Settings from './pages/Settings'
import Search from './pages/Search'
import { api } from './api'

export default function App() {
  const [activeTab, setActiveTab] = useState('feed')
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(true)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [loginError, setLoginError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [headerSearchQuery, setHeaderSearchQuery] = useState('')

  // Check for saved user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('voicevault_user')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        api.setUserId(userData.user_id)
        setShowLogin(false)
      } catch (err) {
        console.error('Failed to parse saved user:', err)
        localStorage.removeItem('voicevault_user')
      }
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError(null)

    try {
      const response = isRegistering
        ? await api.register(loginEmail, loginPassword, loginEmail.split('@')[0])
        : await api.login(loginEmail, loginPassword)

      setUser(response.user)
      localStorage.setItem('voicevault_user', JSON.stringify(response.user))
      setShowLogin(false)
      setLoginEmail('')
      setLoginPassword('')
    } catch (err) {
      setLoginError(err.message)
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('voicevault_user')
    setShowLogin(true)
    setActiveTab('feed')
  }

  const handleSearch = async (query) => {
    setSearchQuery(query)

    if (query.trim() && user?.user_id) {
      try {
        const results = await api.searchRAG(query, user.user_id)
        console.log('Search results:', results)
        // You could display these results in a modal or separate view
      } catch (err) {
        console.error('Search error:', err)
      }
    }
  }

  const handleNavigateToSearch = (query) => {
    setActiveTab('search')
    setHeaderSearchQuery(query)
  }

  const handlePostCreated = () => {
    // Switch to feed after creating a post
    setActiveTab('feed')
  }

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('voicevault_user', JSON.stringify(updatedUser))
  }

  // Render current page
  const renderPage = () => {
    if (!user) return null

    switch (activeTab) {
      case 'create':
        return <CreatePost user={user} onPostCreated={handlePostCreated} />
      case 'search':
        return <Search user={user} initialQuery={headerSearchQuery} />
      case 'history':
        return <History user={user} />
      case 'settings':
        return <Settings user={user} onUpdate={handleUserUpdate} />
      default:
        return <Feed user={user} />
    }
  }

  // Login/Register Screen
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#f4b840] rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">VoiceVault</h1>
            <p className="text-gray-600 mt-2">Archive your audio memories</p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] px-4 py-3 rounded-lg font-semibold transition-colors"
            >
              {isRegistering ? 'Register' : 'Log In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering)
                setLoginError(null)
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {isRegistering
                ? 'Already have an account? Log in'
                : "Don't have an account? Register"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main App
  return (
    <div className="h-screen bg-gray-50 text-gray-800 flex flex-col overflow-hidden">
      <Header onSearch={handleSearch} onLogout={handleLogout} onNavigateToSearch={handleNavigateToSearch} />

      <div className="flex-1 flex overflow-hidden max-w-[1400px] mx-auto w-full">
        <Sidebar user={user} activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 overflow-y-auto p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
