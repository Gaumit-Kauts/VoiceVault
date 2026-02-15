import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { api } from '../api'

export default function CreatePost({ user, onPostCreated }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [language, setLanguage] = useState('en')
  const [audioFile, setAudioFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Check file type
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp4', 'video/mp4']
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|flac|m4a|mp4|mov|mkv|webm)$/i)) {
        setError('Invalid file type. Please upload an audio or video file.')
        return
      }
      
      setAudioFile(file)
      setError(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!audioFile) {
      setError('Please select an audio file')
      return
    }

    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    if (!user?.user_id) {
      setError('You must be logged in to create a post')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', audioFile)
      formData.append('user_id', user.user_id)
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('visibility', visibility)
      formData.append('language', language)

      const response = await api.uploadPost(formData)
      
      console.log('Upload response:', response)
      setSuccess(true)
      
      // Reset form
      setTitle('')
      setDescription('')
      setVisibility('private')
      setLanguage('en')
      setAudioFile(null)
      
      // Notify parent component
      onPostCreated?.(response)

      // Show success message
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err.message || 'Failed to upload post')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Archive</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              Post uploaded successfully! Transcript is being generated...
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your archive a descriptive title..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent"
              required
              disabled={uploading}
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description or context for this recording..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent resize-none"
              disabled={uploading}
            />
          </div>

          {/* Audio File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Audio/Video File *
            </label>
            
            {!audioFile ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload size={32} className="text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    MP3, WAV, OGG, FLAC, M4A, MP4, MOV, MKV, WEBM
                  </p>
                </div>
                <input
                  type="file"
                  accept="audio/*,video/mp4,video/quicktime,video/x-matroska,video/webm"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-[#f4b840] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Upload size={18} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {audioFile.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAudioFile(null)}
                  className="text-gray-500 hover:text-gray-700 ml-2"
                  disabled={uploading}
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent"
              disabled={uploading}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="ar">Arabic</option>
            </select>
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Visibility</p>
              <p className="text-sm text-gray-600">
                {visibility === 'private' ? 'Only you can see this post' : 'Anyone can see this post'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  visibility === 'private'
                    ? 'bg-[#f4b840] text-[#1a1a1a]'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={uploading}
              >
                Private
              </button>
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  visibility === 'public'
                    ? 'bg-[#f4b840] text-[#1a1a1a]'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={uploading}
              >
                Public
              </button>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setTitle('')
                setDescription('')
                setAudioFile(null)
                setError(null)
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !audioFile || !title.trim()}
              className="flex-1 px-4 py-2 bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1a1a1a]"></div>
                  Uploading...
                </span>
              ) : (
                'Create Archive'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
