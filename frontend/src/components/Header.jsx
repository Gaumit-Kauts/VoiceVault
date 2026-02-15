import { Search, User, Volume2 } from 'lucide-react'
import { useState } from 'react'

export default function Header({ user, onSearch, onLogout }) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch?.(query)
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 bg-[#f4b840] rounded-lg flex items-center justify-center">
            <Volume2 size={18} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">VoiceVault</h1>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search your archives..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent"
            />
          </div>
        </div>

        {/* Right: User Info / Login */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">{user.display_name || user.email}</span>
              <button
                onClick={onLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          ) : (
            <button className="bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] px-4 py-2 rounded text-sm font-medium flex items-center gap-2">
              <User size={16} />
              Log In
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
