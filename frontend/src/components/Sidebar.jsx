import { Plus, Home, History, Settings } from 'lucide-react'

export default function Sidebar({ user, activeTab, onTabChange }) {
  const navItems = [
    { id: 'create', label: 'Make an Archive Post', icon: Plus },
    { id: 'feed', label: 'My Feed', icon: Home },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  // Get user initials
  const getInitials = () => {
    if (user?.display_name) {
      return user.display_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }
  
  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-6 hidden md:block flex-shrink-0 overflow-y-auto">
      <div className="sticky top-6">
        {/* User Profile */}
        {user && (
          <div className="mb-6 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#f4b840] to-[#e5a930] rounded-full flex items-center justify-center text-[#1a1a1a] font-bold text-2xl mx-auto mb-3">
              {getInitials()}
            </div>
            <h2 className="text-base font-semibold text-gray-900 truncate">
              {user.display_name || user.email}
            </h2>
            {user.bio && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {user.bio}
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'text-gray-900 bg-gray-200 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
