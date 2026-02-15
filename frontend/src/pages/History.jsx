import { useState, useEffect } from 'react'
import { FileText, Trash2, Eye, Edit2 } from 'lucide-react'
import { api } from '../api'
import EditPostModal from '../components/EditPostModal'

export default function History({ user, onViewPost }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState(null)
  const [editingPost, setEditingPost] = useState(null)

  useEffect(() => {
    if (user?.user_id) {
      fetchHistory()
    }
  }, [user, page])

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.getUserHistory(user.user_id, page, 20)
      setPosts(response.history || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (postId) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    setDeleting(postId)
    try {
      await api.deletePost(postId, user.user_id)
      // Remove from local state immediately
      setPosts((prev) => prev.filter((p) => p.post_id !== postId))
    } catch (err) {
      alert('Failed to delete post: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  const handleView = (postId) => {
    if (onViewPost) {
      onViewPost(postId)
    }
  }

  const handleEdit = (post) => {
    setEditingPost(post)
  }

  const handleSaveEdit = (updatedPost) => {
    if (updatedPost && updatedPost.post_id) {
      setPosts((prev) =>
        prev.map((post) =>
          post.post_id === updatedPost.post_id ? { ...post, ...updatedPost } : post
        )
      )
      return
    }
    fetchHistory()
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f4b840]"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-800">Error loading history: {error}</p>
          <button
            onClick={fetchHistory}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">History</h2>
        <p className="text-sm text-gray-600">{posts.length} archive{posts.length !== 1 ? 's' : ''}</p>
      </div>

      {/* My Posted Archives */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText size={20} />
          My Posted Archives
        </h3>

        {posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.post_id}
                className={`flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors ${
                  deleting === post.post_id ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 mb-1">{post.title}</h4>

                  {post.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {post.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                    <span>{formatDate(post.created_at)}</span>
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      post.visibility === 'public'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {post.visibility}
                    </span>
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      post.status === 'ready' ? 'bg-green-100 text-green-700' :
                      post.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {post.status}
                    </span>
                  </div>

                  {post.language && (
                    <span className="inline-block text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {post.language.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {post.status === 'ready' && (
                    <button
                      onClick={() => handleView(post.post_id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View full post"
                    >
                      <Eye size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(post)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Edit post"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(post.post_id)}
                    disabled={deleting === post.post_id}
                    className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Delete post"
                  >
                    {deleting === post.post_id ? (
                      <div className="animate-spin rounded-full h-[18px] w-[18px] border-b-2 border-red-500"></div>
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">
            No posts yet. Create your first archive!
          </p>
        )}
      </div>

      {/* Summary Stats */}
      {/* {posts.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{posts.length}</div>
            <div className="text-sm text-gray-600">Total Archives</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {posts.filter(p => p.status === 'ready').length}
            </div>
            <div className="text-sm text-gray-600">Ready</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {posts.filter(p => p.visibility === 'public').length}
            </div>
            <div className="text-sm text-gray-600">Public</div>
          </div>
        </div>
      )} */}

      {/* Pagination */}
      {posts.length >= 20 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          user={user}
          onClose={() => setEditingPost(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}
