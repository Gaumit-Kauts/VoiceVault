import { useState } from 'react'
import { User, Lock, Bell, Globe, Trash2 } from 'lucide-react'

export default function Settings({ userSettings, onUpdate }) {
  const [settings, setSettings] = useState(userSettings || {
    notifications: {
      newFollowers: true,
      comments: true,
      likes: false,
      mentions: true,
    },
    privacy: {
      profileVisibility: 'public',
      showListeningHistory: true,
      allowComments: true,
    },
    account: {
      email: 'john.doe@email.com',
      username: 'johndoe',
    }
  })

  const handleToggle = (category, setting) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: !prev[category][setting]
      }
    }))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      {/* Account Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User size={20} />
          Account Information
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Username</label>
            <input
              type="text"
              value={settings.account.username}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
            <input
              type="email"
              value={settings.account.email}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Bio</label>
            <textarea
              rows={3}
              placeholder="Tell us about yourself..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent resize-none"
            />
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={20} />
          Privacy
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Profile Visibility</p>
              <p className="text-sm text-gray-600">Who can see your profile</p>
            </div>
            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840]">
              <option value="public">Public</option>
              <option value="followers">Followers Only</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Show Listening History</p>
              <p className="text-sm text-gray-600">Allow others to see what you've listened to</p>
            </div>
            <button
              onClick={() => handleToggle('privacy', 'showListeningHistory')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.privacy.showListeningHistory ? 'bg-[#f4b840]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.privacy.showListeningHistory ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Allow Comments</p>
              <p className="text-sm text-gray-600">Let others comment on your posts</p>
            </div>
            <button
              onClick={() => handleToggle('privacy', 'allowComments')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.privacy.allowComments ? 'bg-[#f4b840]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.privacy.allowComments ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Bell size={20} />
          Notifications
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">New Followers</p>
              <p className="text-sm text-gray-600">When someone follows you</p>
            </div>
            <button
              onClick={() => handleToggle('notifications', 'newFollowers')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.notifications.newFollowers ? 'bg-[#f4b840]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.notifications.newFollowers ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Comments</p>
              <p className="text-sm text-gray-600">When someone comments on your post</p>
            </div>
            <button
              onClick={() => handleToggle('notifications', 'comments')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.notifications.comments ? 'bg-[#f4b840]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.notifications.comments ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Likes</p>
              <p className="text-sm text-gray-600">When someone likes your post</p>
            </div>
            <button
              onClick={() => handleToggle('notifications', 'likes')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.notifications.likes ? 'bg-[#f4b840]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.notifications.likes ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Mentions</p>
              <p className="text-sm text-gray-600">When someone mentions you</p>
            </div>
            <button
              onClick={() => handleToggle('notifications', 'mentions')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.notifications.mentions ? 'bg-[#f4b840]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.notifications.mentions ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
          <Trash2 size={20} />
          Danger Zone
        </h3>

        <div className="space-y-3">
          <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Export My Data
          </button>
          <button className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
            Delete Account
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={() => onUpdate?.(settings)}
          className="flex-1 px-4 py-2 bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] rounded-lg font-medium transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}
