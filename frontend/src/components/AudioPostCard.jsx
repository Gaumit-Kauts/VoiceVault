import { Play, Volume2, MoreVertical, Clock } from 'lucide-react'

export default function AudioPostCard({ post, onPlay }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

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
            </div>
          </div>
          <button className="text-gray-500 hover:text-gray-700">
            <MoreVertical size={18} />
          </button>
        </div>

        {/* Description */}
        {post.description && (
          <p className="text-sm text-gray-700 mb-4 line-clamp-2">
            {post.description}
          </p>
        )}

        {/* Audio Player - Only show if ready */}
        {post.status === 'ready' && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => onPlay?.(post)}
                className="w-10 h-10 bg-[#f4b840] hover:bg-[#e5a930] rounded-full flex items-center justify-center text-[#1a1a1a] transition-colors"
              >
                <Play size={16} fill="currentColor" />
              </button>
              <div className="flex-1">
                <div className="h-1.5 bg-gray-300 rounded-full overflow-hidden mb-2">
                  <div className="h-full w-0 bg-[#f4b840] rounded-full"></div>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>0:00</span>
                  <span>--:--</span>
                </div>
              </div>
              <button className="text-gray-600 hover:text-gray-900">
                <Volume2 size={18} />
              </button>
            </div>
          </div>
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

        {/* Language Tag */}
        {post.language && (
          <div className="mt-3">
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
              {post.language.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </article>
  )
}
