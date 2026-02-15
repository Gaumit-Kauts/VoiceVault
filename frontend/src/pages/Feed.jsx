import { useState, useEffect } from 'react'
import AudioPostCard from '../components/AudioPostCard'
import { api } from '../api'

export default function Feed({ user }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [visibilityFilter, setVisibilityFilter] = useState('all')

  useEffect(() => {
    if (user?.user_id) {
      fetchPosts()
    }
  }, [user, page, visibilityFilter])

  const fetchPosts = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = {
        page,
        limit: 20,
        user_id: user.user_id,
      }
      
      if (visibilityFilter !== 'all') {
        params.visibility = visibilityFilter
      }

      const response = await api.getPosts(params)
      setPosts(response.posts || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = async (post) => {
    console.log('Playing post:', post)
    // Implement audio playback logic
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
          <p className="text-red-800">Error loading feed: {error}</p>
          <button
            onClick={fetchPosts}
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
      {/* Filter Pills */}
      <div className="flex gap-2">
        <button
          onClick={() => setVisibilityFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            visibilityFilter === 'all'
              ? 'bg-[#f4b840] text-[#1a1a1a]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Posts
        </button>
        <button
          onClick={() => setVisibilityFilter('public')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            visibilityFilter === 'public'
              ? 'bg-[#f4b840] text-[#1a1a1a]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Public
        </button>
        <button
          onClick={() => setVisibilityFilter('private')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            visibilityFilter === 'private'
              ? 'bg-[#f4b840] text-[#1a1a1a]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Private
        </button>
      </div>

      {/* Posts List */}
      {posts.length > 0 ? (
        posts.map((post) => (
          <AudioPostCard
            key={post.post_id}
            post={post}
            onPlay={handlePlay}
          />
        ))
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-2">No posts to display</p>
          <p className="text-sm text-gray-500">Create your first archive to get started!</p>
        </div>
      )}

      {/* Pagination */}
      {posts.length >= 20 && (
        <div className="flex justify-center gap-2 pb-6">
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
    </div>
  )
}
