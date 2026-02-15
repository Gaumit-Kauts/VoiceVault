import { useState } from 'react'
import { User, Trash2 } from 'lucide-react'

export default function Settings({ user, onUpdate }) {
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // In a real app, you'd call an update user API
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onUpdate?.({
        ...user,
        display_name: displayName,
        bio: bio
      })
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings: ' + error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Account Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User size={20} />
          Account Information
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell us about yourself..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              User ID
            </label>
            <input
              type="text"
              value={user?.user_id || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Your unique identifier</p>
          </div>
        </div>
      </div>

      {/* Account Created */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Account Details
        </h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Account Created</span>
            <span className="font-medium text-gray-900">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Last Updated</span>
            <span className="font-medium text-gray-900">
              {user?.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
          <Trash2 size={20} />
          Danger Zone
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          Once you delete your account, there is no going back. All your archives and data will be permanently deleted.
        </p>
        
        <button className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
          Delete Account
        </button>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setDisplayName(user?.display_name || '')
            setBio(user?.bio || '')
            setMessage(null)
          }}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-4 py-2 bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
