import { Play, Volume2, Heart, MessageCircle, Share2, Bookmark, MoreVertical } from 'lucide-react'

export default function AudioPostCard({ post, onLike, onComment, onShare, onBookmark }) {
  return (
    <article className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
              style={{ background: post.user.avatarColor }}
            >
              {post.user.initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{post.user.name}</span>
                <span className="text-gray-500 text-sm">• {post.timeAgo}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {post.categories.map((category, index) => (
                  <span
                    key={index}
                    className={`text-xs px-2 py-1 rounded border ${
                      category.color === 'yellow' ? 'bg-[#f4b840]/10 text-[#f4b840] border-[#f4b840]/20' :
                      category.color === 'blue' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                      category.color === 'purple' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                      'bg-green-500/10 text-green-600 border-green-500/20'
                    }`}
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button className="text-gray-500 hover:text-gray-700">
            <MoreVertical size={18} />
          </button>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">{post.title}</h3>

        {/* Audio Player */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-4 mb-3">
            <button className="w-10 h-10 bg-[#f4b840] hover:bg-[#e5a930] rounded-full flex items-center justify-center text-[#1a1a1a]">
              <Play size={16} fill="currentColor" />
            </button>
            <div className="flex-1">
              <div className="h-1.5 bg-gray-300 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-[#f4b840] rounded-full"
                  style={{ width: `${post.audio.progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{post.audio.currentTime}</span>
                <span>{post.audio.duration}</span>
              </div>
            </div>
            <button className="text-gray-600 hover:text-gray-900">
              <Volume2 size={18} />
            </button>
          </div>
        </div>

        {/* Transcription Preview */}
        {post.transcript && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
              {post.transcript}
            </p>
            <button className="text-xs text-[#f4b840] hover:text-[#e5a930] mt-2 font-medium">
              Read full transcript →
            </button>
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-6">
        <button
          onClick={() => onLike?.(post.id)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
        >
          <Heart size={18} />
          <span>{post.likes}</span>
        </button>
        <button
          onClick={() => onComment?.(post.id)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
        >
          <MessageCircle size={18} />
          <span>{post.comments}</span>
        </button>
        <button
          onClick={() => onShare?.(post.id)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
        >
          <Share2 size={18} />
          <span>Share</span>
        </button>
        <button
          onClick={() => onBookmark?.(post.id)}
          className="ml-auto text-gray-600 hover:text-gray-900"
        >
          <Bookmark size={18} />
        </button>
      </div>
    </article>
  )
}
