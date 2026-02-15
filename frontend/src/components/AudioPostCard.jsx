import { Play, Pause, Volume2, Clock, ChevronDown, ChevronUp, Download, ExternalLink } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { api } from '../api'

export default function AudioPostCard({ post, onViewPost }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [transcript, setTranscript] = useState(null)
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const [transcriptExpanded, setTranscriptExpanded] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const audioRef = useRef(null)

  // DEBUG: Log post data to console
  useEffect(() => {
    console.log('Post data:', post)
    console.log('Audio URL:', post.audio_url)
    console.log('Status:', post.status)
  }, [post])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Load transcript on mount if post is ready
  useEffect(() => {
    if (post.status === 'ready' && !transcript && !loadingTranscript) {
      loadTranscript()
    }

    // Set audio source if available
    if (post.audio_url && audioRef.current) {
      console.log('Setting audio src to:', post.audio_url)
      audioRef.current.src = post.audio_url
      audioRef.current.load() // Force reload
    }
  }, [post.post_id, post.status, post.audio_url])

  const loadTranscript = async () => {
    setLoadingTranscript(true)
    try {
      const metadata = await api.getPostMetadata(post.post_id)
      if (metadata && metadata.metadata) {
        const metadataObj = JSON.parse(metadata.metadata)
        const promptText = metadataObj.prompt || ''
        const transcriptMatch = promptText.match(/Transcript:\n([\s\S]*?)\n\nAnswer user questions/)
        if (transcriptMatch) {
          setTranscript(transcriptMatch[1].trim())
        } else {
          setTranscript('Transcript not available')
        }
      }
    } catch (err) {
      console.error('Failed to load transcript:', err)
      setTranscript('Failed to load transcript')
    } finally {
      setLoadingTranscript(false)
    }
  }

  const handleDownload = async () => {
    if (downloading) return

    setDownloading(true)
    try {
      const zipBlob = await api.exportPost(post.post_id)

      const url = window.URL.createObjectURL(zipBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${post.title.replace(/[^a-zA-Z0-9]/g, "_")}_${post.post_id}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to download post:", err)
      alert(`Download failed: ${err.message}`)
    } finally {
      setDownloading(false)
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      console.log('Audio metadata loaded, duration:', audioRef.current.duration)
      setDuration(audioRef.current.duration)
    }
  }

  const handleAudioError = (e) => {
    console.error('Audio error:', e)
    console.error('Audio element error:', audioRef.current?.error)
  }

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration

    if (audioRef.current) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleView = (postId) => {
    if (onViewPost) {
      onViewPost(postId)
    }
  }


  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <article className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
              {post.visibility === 'private' && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                  Private
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock size={14} />
              <span>{formatDate(post.created_at)}</span>
              <span>•</span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                post.status === 'ready' ? 'bg-green-100 text-green-700' :
                post.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {post.status}
              </span>
              <span>•</span>
              {post.language && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                  {post.language.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">

            {post.status === 'ready' && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download post as ZIP"
              >
                {downloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1a1a1a]"></div>
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Download</span>
                  </>
                )}
              </button>
            )}
            {post.status === 'ready' && (
              <button
                onClick={() => handleView(post.post_id)}
                className="flex items-center gap-1 text-sm text-[#f4b840] hover:text-[#e5a930]"
              >
                <span>View Post</span>
                <ExternalLink size={14} />
              </button>

            )}
          </div>
        </div>

        {/* Description */}
        {post.description && (
          <p className="text-sm text-gray-700 mb-4 line-clamp-2">
            {post.description}
          </p>
        )}

        {/* Audio Player - Only show if ready */}
        {post.status === 'ready' && (
          <>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              {/* Hidden audio element */}
              <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                onError={handleAudioError}
                onCanPlay={() => console.log('Audio can play')}
                preload="metadata"
                crossOrigin="anonymous"
              />

              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 bg-[#f4b840] hover:bg-[#e5a930] rounded-full flex items-center justify-center text-[#1a1a1a] transition-colors"
                >
                  {isPlaying ? (
                    <Pause size={16} fill="currentColor" />
                  ) : (
                    <Play size={16} fill="currentColor" />
                  )}
                </button>
                <div className="flex-1">
                  <div
                    className="h-1.5 bg-gray-300 rounded-full overflow-hidden mb-2 cursor-pointer"
                    onClick={handleSeek}
                  >
                    <div
                      className="h-full bg-[#f4b840] rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 size={18} className="text-gray-600" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1.5 bg-gray-300 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #f4b840 0%, #f4b840 ${volume * 100}%, #d1d5db ${volume * 100}%, #d1d5db 100%)`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Transcript Section - Always shown */}
            <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setTranscriptExpanded(!transcriptExpanded)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">Transcript</span>
                {loadingTranscript ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : (
                  transcriptExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />
                )}
              </button>

              {transcript && (
                <div className={`bg-white transition-all ${transcriptExpanded ? 'max-h-96' : 'max-h-24'} overflow-y-auto`}>
                  <div className="p-4">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {transcript}
                    </p>
                  </div>
                </div>
              )}

              {!transcript && !loadingTranscript && (
                <div className="p-4 bg-white">
                  <p className="text-sm text-gray-500 italic">No transcript available</p>
                </div>
              )}

              {loadingTranscript && (
                <div className="p-4 bg-white text-center">
                  <p className="text-sm text-gray-500">Loading transcript...</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Processing Status */}
        {post.status === 'processing' && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f4b840] mx-auto mb-2"></div>
            <p className="text-sm text-yellow-800">Processing audio and generating transcript...</p>
          </div>
        )}

        {/* Failed Status */}
        {post.status === 'failed' && (
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-sm text-red-800">Failed to process this recording. Please try uploading again.</p>
          </div>
        )}
      </div>
    </article>
  )
}
