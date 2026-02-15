import { FileText, Filter, Trash2 } from 'lucide-react'

export default function History({ userPosts, onDelete }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">History</h2>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
          <Filter size={18} />
          <span>Filter</span>
        </button>
      </div>

      {/* My Posted Archives */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText size={20} />
          My Posted Archives
        </h3>

        {userPosts?.length > 0 ? (
          <div className="space-y-3">
            {userPosts.map((post) => (
              <div key={post.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 mb-1">{post.title}</h4>
                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                    <span>{post.createdAt}</span>
                    <span>•</span>
                    <span>{post.duration}</span>
                    <span>•</span>
                    <span className={post.isPrivate ? 'text-gray-500' : 'text-green-600'}>
                      {post.isPrivate ? 'Private' : 'Public'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>👍 {post.likes} likes</span>
                    <span>💬 {post.comments} comments</span>
                    <span>🎧 {post.listens} listens</span>
                  </div>
                  {post.categories && (
                    <div className="flex gap-2 mt-2">
                      {post.categories.map((cat, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onDelete?.(post.id)}
                  className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                  title="Delete post"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No posts yet. Create your first archive!</p>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{userPosts?.length || 0}</div>
          <div className="text-sm text-gray-600">Total Posts</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {userPosts?.reduce((sum, post) => sum + post.likes, 0) || 0}
          </div>
          <div className="text-sm text-gray-600">Total Likes</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {userPosts?.reduce((sum, post) => sum + post.listens, 0) || 0}
          </div>
          <div className="text-sm text-gray-600">Total Listens</div>
        </div>
      </div>
    </div>
  )
}
