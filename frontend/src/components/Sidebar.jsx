import { Plus, Home, History, Settings } from 'lucide-react'

export default function Sidebar({ activeTab, onTabChange }) {
  const navItems = [
    { id: 'create', label: 'Make an Archive Post', icon: Plus },
    { id: 'feed', label: 'My Feed', icon: Home },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-6 hidden md:block flex-shrink-0 overflow-y-auto">
      <div className="sticky top-6">

        {/* Profile Image */}
        <div className="w-32 h-32 bg-gradient-to-br from-[#f4b840] to-[#e5a930] rounded-full flex items-center justify-center text-[#1a1a1a] font-bold text-4xl mx-auto mb-4">
          JD
        </div>
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">John Doe</h2>
          <p className="text-sm text-gray-600">Oral Historian</p>
          <p className="text-xs text-gray-500 mt-2">San Francisco, CA</p>
        </div>
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
