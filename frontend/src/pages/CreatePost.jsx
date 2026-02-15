import { useState } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import { api } from '../api'

export default function CreatePost({ user, onPostCreated }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [language, setLanguage] = useState('en')
  const [audioFile, setAudioFile] = useState(null)
  const [transcribing, setTranscribing] = useState(false)
  const [transcript, setTranscript] = useState(null)
  const [postData, setPostData] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp4', 'video/mp4']
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|flac|m4a|mp4|mov|mkv|webm)$/i)) {
        setError('Invalid file type. Please upload an audio or video file.')
        return
      }
      
      setAudioFile(file)
      setTranscript(null)
      setPostData(null)
      setError(null)
    }
  }

  const handleTranscribe = async () => {
    if (!audioFile) {
      setError('Please select an audio file first')
      return
    }

    if (!title.trim()) {
      setError('Please enter a title first')
      return
    }

    if (!user?.user_id) {
      setError('You must be logged in')
      return
    }

    setTranscribing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', audioFile)
      formData.append('user_id', user.user_id)
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('visibility', visibility)
      formData.append('language', language)

      const response = await api.uploadPost(formData)
      
      if (response.transcript_text) {
        setTranscript(response.transcript_text)
        setPostData(response)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError('Transcription completed but no transcript returned')
      }
    } catch (err) {
      setError(err.message || 'Failed to transcribe audio')
    } finally {
      setTranscribing(false)
    }
  }

  const handleReset = () => {
    setTitle('')
    setDescription('')
    setVisibility('private')
    setLanguage('en')
    setAudioFile(null)
    setTranscript(null)
    setPostData(null)
    setError(null)
    setSuccess(false)
  }

  const handleCreateAnother = () => {
    handleReset()
    onPostCreated?.()
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
            <p className="text-sm text-green-800 font-medium">
              ✓ Archive created and transcribed successfully!
            </p>
          </div>
        )}

        {!transcript ? (
          // STEP 1: Upload and Configure
          <div className="space-y-6">
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
                disabled={transcribing}
              />
            </div>

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
                disabled={transcribing}
              />
            </div>

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
                    disabled={transcribing}
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
                    disabled={transcribing}
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent"
                disabled={transcribing}
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
                  disabled={transcribing}
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
                  disabled={transcribing}
                >
                  Public
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTranscribe}
              disabled={transcribing || !audioFile || !title.trim()}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {transcribing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Transcribing & Creating Archive...
                </>
              ) : (
                <>
                  <FileText size={18} />
                  Transcribe & Create Archive
                </>
              )}
            </button>
            <p className="text-xs text-gray-600 text-center">
              This will upload your file and generate a transcript
            </p>
          </div>
        ) : (
          // STEP 2: Show Results
          <div className="space-y-6">
            <div className="p-5 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900 mb-1">
                    Archive Created Successfully!
                  </h3>
                  <p className="text-sm text-green-700">
                    Your audio has been transcribed and saved.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-white rounded border border-green-200">
                <p className="text-xs font-semibold text-gray-900 mb-2">TRANSCRIPT</p>
                <p className="text-sm text-gray-700 max-h-48 overflow-y-auto">
                  {transcript}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
                  <span>{transcript.length} characters</span>
                  <span>{postData?.rag_chunk_count || 0} RAG chunks</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-600 mb-1">Title</p>
                <p className="text-sm font-medium text-gray-900">{title}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Visibility</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{visibility}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Language</p>
                <p className="text-sm font-medium text-gray-900">{language.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Status</p>
                <p className="text-sm font-medium text-green-600">Ready</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => onPostCreated?.()}
                className="flex-1 px-4 py-2 bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] rounded-lg font-medium transition-colors"
              >
                View in Feed
              </button>
              <button
                onClick={handleCreateAnother}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Create Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
