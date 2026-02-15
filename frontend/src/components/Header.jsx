import { Search, LogOut } from 'lucide-react'
import { useState } from 'react'

export default function Header({ onSearch, onLogout, onNavigateToSearch }) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onNavigateToSearch?.(searchQuery.trim())
      onSearch?.(searchQuery.trim())
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 bg-[#f4b840] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">VoiceVault</h1>
        </div>

        {/* Center: Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search your archives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent"
            />
          </div>
        </form>

        {/* Right: Logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded hover:bg-gray-100 transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
