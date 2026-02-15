import { useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../api'

export default function EditPostModal({ post, user, onClose, onSave }) {
  const [title, setTitle] = useState(post.title)
  const [description, setDescription] = useState(post.description || '')
  const [visibility, setVisibility] = useState(post.visibility)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const updates = {
        user_id: user.user_id,
        title: title.trim(),
        description: description.trim(),
        visibility
      }

      const updatedPost = await api.editPost(post.post_id, updates)
      onSave?.(updatedPost)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update post')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit Post</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent"
              required
              disabled={saving}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent resize-none"
              disabled={saving}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Visibility
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                  visibility === 'private'
                    ? 'bg-[#f4b840] text-[#1a1a1a]'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={saving}
              >
                Private
              </button>
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                  visibility === 'public'
                    ? 'bg-[#f4b840] text-[#1a1a1a]'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={saving}
              >
                Public
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {visibility === 'private' ? 'Only you can see this post' : 'Anyone can see this post'}
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 px-4 py-2 bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
