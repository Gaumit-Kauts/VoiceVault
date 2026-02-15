import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Clock, Download, Share2, Calendar, Globe, Lock, Play, Pause, Volume2 } from 'lucide-react'
import { api } from '../api'

export default function PostDetail({ postId, user, onBack }) {
  const [post, setPost] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [chunks, setChunks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(false)

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const audioRef = useRef(null)

  useEffect(() => {
    if (postId) {
      loadPostData()
    }
  }, [postId])

  // Set audio source when post loads
  useEffect(() => {
    if (post?.audio_url && audioRef.current) {
      console.log('Setting audio source:', post.audio_url)
      audioRef.current.src = post.audio_url
      audioRef.current.load()
    }
  }, [post?.audio_url])

  const loadPostData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load post data (should already include audio_url from backend)
      const postData = await api.getPost(postId)
      console.log('Loaded post data:', postData)
      setPost(postData)

      // Load metadata (contains transcript)
      try {
        const metadataResponse = await api.getPostMetadata(postId)
        if (metadataResponse && metadataResponse.metadata) {
          const metadataObj = JSON.parse(metadataResponse.metadata)
          setMetadata(metadataObj)
        }
      } catch (err) {
        console.error('Failed to load metadata:', err)
      }

      // Load RAG chunks (timestamped transcript segments)
      try {
        const chunksResponse = await api.request(`/posts/${postId}/chunks?limit=1000`)
        setChunks(chunksResponse.chunks || [])
      } catch (err) {
        console.error('Failed to load chunks:', err)
      }

    } catch (err) {
      setError(err.message || 'Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const extractTranscript = () => {
    if (!metadata?.prompt) return null
    const match = metadata.prompt.match(/Transcript:\n([\s\S]*?)\n\nAnswer user questions/)
    return match ? match[1].trim() : null
  }

  // Audio player handlers
  const togglePlay = () => {
    if (!audioRef.current || !post?.audio_url) return

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

  const handleAudioError = (e) => {
    console.error('Audio error:', e)
    console.error('Audio element error:', audioRef.current?.error)
  }

  const handleDownload = async () => {
    if (downloading) return

    setDownloading(true)
    try {
      const zipBlob = await api.exportPost(postId)
      const url = window.URL.createObjectURL(zipBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${post.title.replace(/[^a-zA-Z0-9]/g, "_")}_${postId}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to download:", err)
      alert(`Download failed: ${err.message}`)
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.description,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const transcript = extractTranscript()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f4b840]"></div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">{error || 'Post not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        {/* Title and Meta */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 flex-1">{post.title}</h1>
            <div className="flex items-center gap-2">
              {post.visibility === 'private' ? (
                <Lock size={20} className="text-gray-500" />
              ) : (
                <Globe size={20} className="text-green-500" />
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar size={16} />
              <span>{formatDate(post.created_at)}</span>
            </div>
            <span>•</span>
            <div className={`px-2 py-1 rounded text-xs ${
              post.status === 'ready' ? 'bg-green-100 text-green-700' :
              post.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {post.status}
            </div>
            {post.language && (
              <>
                <span>•</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  {post.language.toUpperCase()}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {post.description && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-700 leading-relaxed">{post.description}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading || post.status !== 'ready'}
            className="flex items-center gap-2 px-4 py-2 bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1a1a1a]"></div>
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Download</span>
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded font-medium transition-colors"
          >
            <Share2 size={18} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Audio Player */}
      {post.status === 'ready' && post.audio_url && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Audio Player</h2>

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

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="w-12 h-12 bg-[#f4b840] hover:bg-[#e5a930] rounded-full flex items-center justify-center text-[#1a1a1a] transition-colors"
              >
                {isPlaying ? (
                  <Pause size={20} fill="currentColor" />
                ) : (
                  <Play size={20} fill="currentColor" />
                )}
              </button>

              <div className="flex-1">
                <div
                  className="h-2 bg-gray-300 rounded-full overflow-hidden mb-2 cursor-pointer"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full bg-[#f4b840] rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
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
                  className="w-20 h-2 bg-gray-300 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #f4b840 0%, #f4b840 ${volume * 100}%, #d1d5db ${volume * 100}%, #d1d5db 100%)`
                  }}
                />
              </div>
            </div>
          </div>

          {!post.audio_url && (
            <p className="text-sm text-gray-500 text-center py-4">
              Audio file not available
            </p>
          )}
        </div>
      )}

      {/* Full Transcript */}
      {transcript && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Full Transcript</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{transcript}</p>
          </div>
          {metadata?.transcript_length_chars && (
            <p className="text-xs text-gray-500 mt-4">
              {metadata.transcript_length_chars.toLocaleString()} characters
            </p>
          )}
        </div>
      )}

      {/* Timestamped Segments */}
      {chunks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Timestamped Segments ({chunks.length})
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {chunks.map((chunk, index) => (
              <div
                key={chunk.chunk_id || index}
                className="p-4 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#f4b840] flex-shrink-0">
                    <Clock size={14} />
                    <span>{formatTime(chunk.start_sec)}</span>
                  </div>
                  <p className="text-sm text-gray-700 flex-1">{chunk.text}</p>
                </div>
                {chunk.confidence && (
                  <div className="mt-2 text-xs text-gray-500">
                    Confidence: {Math.round(chunk.confidence * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      {metadata && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {metadata.source_file && (
              <>
                <dt className="text-gray-600">Source File:</dt>
                <dd className="text-gray-900 font-medium">{metadata.source_file}</dd>
              </>
            )}
            {metadata.language && (
              <>
                <dt className="text-gray-600">Language:</dt>
                <dd className="text-gray-900 font-medium">{metadata.language.toUpperCase()}</dd>
              </>
            )}
            {metadata.transcript_length_chars && (
              <>
                <dt className="text-gray-600">Transcript Length:</dt>
                <dd className="text-gray-900 font-medium">
                  {metadata.transcript_length_chars.toLocaleString()} characters
                </dd>
              </>
            )}
            {chunks.length > 0 && (
              <>
                <dt className="text-gray-600">Segments:</dt>
                <dd className="text-gray-900 font-medium">{chunks.length} chunks</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  )
}
