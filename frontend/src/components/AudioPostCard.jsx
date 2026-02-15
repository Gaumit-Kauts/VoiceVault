import { Clock, Download, ExternalLink, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../api'
import AudioPlayer from './AudioPlayer'

export default function AudioPostCard({ post, onViewPost }) {
  const [transcript, setTranscript] = useState(null)
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [author, setAuthor] = useState(null)

  useEffect(() => {
    console.log('Post data:', post)
    console.log('Audio URL:', post.audio_url)
    console.log('Status:', post.status)
  }, [post])

  // Load author data
  useEffect(() => {
    if (post.user_id) {
      loadAuthor()
    }
  }, [post.user_id])

  const loadAuthor = async () => {
    try {
      const userData = await api.getUser(post.user_id)
      setAuthor(userData)
    } catch (err) {
      console.error('Failed to load author:', err)
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

  useEffect(() => {
    if (post.status === 'ready' && !transcript && !loadingTranscript) {
      loadTranscript()
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

  const handleView = (postId) => {
    if (onViewPost) {
      onViewPost(postId)
    }
  }

  const getAuthorDisplayName = () => {
    if (!author) return 'Loading...'
    return author.display_name || author.email?.split('@')[0] || 'Unknown Author'
  }

  const getAuthorInitials = () => {
    if (!author) return '?'
    const name = author.display_name || author.email?.split('@')[0] || '?'
    return name.charAt(0).toUpperCase()
  }

  return (
    <article className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="p-6 pb-4">
        {/* Author Info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#f4b840] to-[#e5a930] rounded-full flex items-center justify-center text-white font-semibold">
            {getAuthorInitials()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{getAuthorDisplayName()}</p>
            <p className="text-xs text-gray-500">{formatDate(post.created_at)}</p>
          </div>
        </div>

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
              <span className={`px-2 py-0.5 rounded text-xs ${
                post.status === 'ready' ? 'bg-green-100 text-green-700' :
                post.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {post.status}
              </span>
              {post.language && (
                <>
                  <span>•</span>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {post.language.toUpperCase()}
                  </span>
                </>
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
              <AudioPlayer src={post.audio_url} />
            </div>

            {/* Transcript Section - Always shown */}
            <div className="mt-6">
              {transcript ? (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-3">
                  {transcript}
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">No transcript available</p>
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
