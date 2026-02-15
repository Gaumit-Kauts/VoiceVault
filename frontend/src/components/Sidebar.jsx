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
