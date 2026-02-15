import { useState } from 'react'
import { Mic, Upload, X } from 'lucide-react'

export default function CreatePost({ onSubmit }) {
  const [title, setTitle] = useState('')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [audioFile, setAudioFile] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)

  const categories = [
    { id: 1, name: 'Historical Events', color: 'yellow' },
    { id: 2, name: 'Cultural Traditions', color: 'purple' },
    { id: 3, name: 'Personal Stories', color: 'blue' },
    { id: 4, name: 'Oral History', color: 'green' },
    { id: 5, name: 'Family History', color: 'blue' },
  ]

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit?.({
      title,
      categories: selectedCategories,
      audioFile,
      isPrivate
    })
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Archive</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your archive a descriptive title..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent"
              required
            />
          </div>

          {/* Audio Recording/Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Audio Recording
            </label>
            <div className="space-y-3">
              {/* Recording Controls */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecording(!isRecording)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                    isRecording
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Mic size={20} />
                  <span>{isRecording ? 'Recording...' : 'Start Recording'}</span>
                </button>

                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 cursor-pointer">
                  <Upload size={20} />
                  <span>Upload Audio</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Audio File Preview */}
              {audioFile && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#f4b840] rounded-lg flex items-center justify-center">
                      <Mic size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{audioFile.name}</p>
                      <p className="text-xs text-gray-600">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAudioFile(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategories.includes(category.id)
                      ? category.color === 'yellow' ? 'bg-[#f4b840] text-[#1a1a1a]' :
                        category.color === 'blue' ? 'bg-blue-500 text-white' :
                        category.color === 'purple' ? 'bg-purple-500 text-white' :
                        'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Private Archive</p>
              <p className="text-sm text-gray-600">Only you can see this post</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isPrivate ? 'bg-[#f4b840]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isPrivate ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] rounded-lg font-medium transition-colors"
            >
              Post Archive
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
