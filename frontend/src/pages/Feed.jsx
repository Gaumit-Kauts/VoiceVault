import AudioPostCard from '../components/AudioPostCard'

export default function Feed({ posts, onLike, onComment, onShare, onBookmark }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {posts?.length > 0 ? (
        posts.map((post) => (
          <AudioPostCard
            key={post.id}
            post={post}
            onLike={onLike}
            onComment={onComment}
            onShare={onShare}
            onBookmark={onBookmark}
          />
        ))
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600">No posts to display</p>
        </div>
      )}
    </div>
  )
}
