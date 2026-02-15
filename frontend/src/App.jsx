import { useState, useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Feed from './pages/Feed'
import CreatePost from './pages/CreatePost'
import History from './pages/History'
import Settings from './pages/Settings'
import Search from './pages/Search'
import PostDetail from './pages/PostDetail'
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
  const [viewingPostId, setViewingPostId] = useState(null)

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
    setViewingPostId(null)
  }

  const handleSearch = async (query) => {
    setSearchQuery(query)

    if (query.trim() && user?.user_id) {
      try {
        const results = await api.searchRAG(query, user.user_id)
        console.log('Search results:', results)
      } catch (err) {
        console.error('Search error:', err)
      }
    }
  }

  const handleNavigateToSearch = (query) => {
    setActiveTab('search')
    setHeaderSearchQuery(query)
    setViewingPostId(null)
  }

  const handleViewPost = (postId) => {
    setViewingPostId(postId)
  }

  const handleBackFromPost = () => {
    setViewingPostId(null)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setViewingPostId(null)
  }

  const handlePostCreated = () => {
    setActiveTab('feed')
    setViewingPostId(null)
  }

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('voicevault_user', JSON.stringify(updatedUser))
  }

  // Render current page
  const renderPage = () => {
    if (!user) return null

    if (viewingPostId) {
      return <PostDetail postId={viewingPostId} user={user} onBack={handleBackFromPost} />
    }

    switch (activeTab) {
      case 'create':
        return <CreatePost user={user} onPostCreated={handlePostCreated} />
      case 'search':
        return <Search user={user} initialQuery={headerSearchQuery} onViewPost={handleViewPost} />
      case 'history':
        return <History user={user} onViewPost={handleViewPost} />
      case 'settings':
        return <Settings user={user} onUpdate={handleUserUpdate} />
      default:
        return <Feed user={user} onViewPost={handleViewPost} />
    }
  }

  // Minimal Elegant Login/Register Screen
  if (showLogin) {
    return (
      <div className="min-h-screen bg-white flex">
        {/* Left Side - Minimal Landing */}
        <div className="hidden lg:flex lg:w-1/2 p-16 flex-col justify-center border-r border-gray-100">
          <div className="max-w-lg">
            {/* Logo */}
            <div className="mb-16">
              <img
                src="/Logo.png"
                alt="VoiceVault"
                className="h-20 w-auto mb-6"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextElementSibling.style.display = 'block'
                }}
              />
              <div style={{display: 'none'}} className="mb-6">
                <span className="text-4xl font-light text-gray-900">VoiceVault</span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-5xl font-light text-gray-900 mb-6 leading-tight">
              Archive your
              <br />
              audio memories
            </h1>

            <p className="text-lg text-gray-600 mb-12 leading-relaxed font-light">
              Preserve, transcribe, and search through your voice recordings
              with intelligent AI-powered archiving.
            </p>

            {/* Simple Features List */}
            <div className="space-y-4 text-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <span className="font-light">Automatic transcription</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <span className="font-light">Intelligent search</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <span className="font-light">Secure storage</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Minimal Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            {/* Mobile Logo */}
            <div className="lg:hidden mb-12 text-center">
              <img
                src="/Logo.png"
                alt="VoiceVault"
                className="h-16 w-auto mx-auto mb-4"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextElementSibling.style.display = 'block'
                }}
              />
              <div style={{display: 'none'}}>
                <span className="text-3xl font-light text-gray-900">VoiceVault</span>
              </div>
            </div>

            {/* Form Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-light text-gray-900 mb-2">
                {isRegistering ? 'Create account' : 'Welcome back'}
              </h2>
              <p className="text-sm text-gray-600 font-light">
                {isRegistering
                  ? 'Start archiving your audio'
                  : 'Sign in to continue'}
              </p>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="mb-6 px-4 py-3 border border-red-200 rounded text-sm text-red-700 bg-red-50">
                {loginError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-light text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-gray-900 transition-colors font-light"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-light text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-gray-900 transition-colors font-light"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] px-4 py-3 rounded font-medium transition-colors"
              >
                {isRegistering ? 'Create account' : 'Sign in'}
              </button>
            </form>

            {/* Toggle */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering)
                  setLoginError(null)
                }}
                className="text-sm text-gray-600 hover:text-gray-900 font-light"
              >
                {isRegistering
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Create one"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main App
  return (
    <div className="h-screen bg-white text-gray-800 flex flex-col overflow-hidden">
      <Header onSearch={handleSearch} onLogout={handleLogout} onNavigateToSearch={handleNavigateToSearch} />

      <div className="flex-1 flex overflow-hidden max-w-[1550px] mx-auto w-full">
        <Sidebar user={user} activeTab={activeTab} onTabChange={handleTabChange} />

        <main className="flex-1 overflow-y-auto p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
