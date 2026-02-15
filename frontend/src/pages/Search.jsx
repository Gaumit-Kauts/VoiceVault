import { useState, useEffect } from 'react'
import { Search as SearchIcon, Sparkles, Clock, ExternalLink } from 'lucide-react'
import { api } from '../api'

export default function Search({ user, initialQuery = '', onViewPost}) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState(null)

  // Auto-search if initialQuery is provided
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery)
      performSearch(initialQuery)
    }
  }, [initialQuery])

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query')
      return
    }

    if (!user?.user_id) {
      setError('You must be logged in to search')
      return
    }

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const response = await api.searchRAG(searchQuery.trim(), user.user_id, 1, 50)
      setResults(response.results || [])
    } catch (err) {
      setError(err.message || 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    performSearch(query)
  }

  const handleView = (postId) => {
    if (onViewPost) {
      onViewPost(postId)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const highlightMatch = (text, searchQuery) => {
    if (!searchQuery) return text

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-[#f4b840] text-[#1a1a1a] px-1 rounded">
          {part}
        </mark>
      ) : part
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <Sparkles size={32} className="text-[#f4b840]" />
          <h1 className="text-3xl font-bold text-gray-900">AI Search</h1>
        </div>
        <p className="text-gray-600">
          Search through all your archived transcripts using natural language
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your archives... (e.g., 'WWII stories', 'family traditions')"
            className="w-full pl-12 pr-32 py-4 border-2 border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f4b840] mb-4"></div>
          <p className="text-gray-600">Searching through your archives...</p>
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          {/* Results Header */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              {results.length > 0 ? (
                <>
                  Found <span className="font-semibold text-gray-900">{results.length}</span> result
                  {results.length !== 1 ? 's' : ''} for "{query}"
                </>
              ) : (
                <>No results found for "{query}"</>
              )}
            </p>
          </div>

          {/* Results List */}
          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={`${result.chunk_id}-${index}`}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  {/* Post Title */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {result.audio_posts?.title || 'Untitled Post'}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {formatTime(result.start_sec)} - {formatTime(result.end_sec)}
                        </span>
                        {result.audio_posts?.created_at && (
                          <>
                            <span>•</span>
                            <span>
                              {new Date(result.audio_posts.created_at).toLocaleDateString()}
                            </span>
                          </>
                        )}
            
                      </div>
                    </div>
                    <button
                      onClick={() => onViewPost && onViewPost(result.post_id)}
                      className="flex items-center gap-1 text-sm text-[#f4b840] hover:text-[#e5a930]"
                    >
                      <span>View Post</span>
                      <ExternalLink size={14} />
                    </button>
                  </div>

                  {/* Transcript Text with Highlighting */}
                  <div className="p-4 bg-gray-50 rounded border border-gray-200">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {highlightMatch(result.text, query)}
                    </p>
                  </div>

                  {/* Timestamp Badge */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      Segment {index + 1}
                    </span>
                    <span className="text-xs text-gray-500">
                      Duration: {Math.round(result.end_sec - result.start_sec)}s
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            searched && !loading && (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <SearchIcon size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Results Found
                </h3>
                <p className="text-gray-600 mb-4">
                  Try different keywords or check your spelling
                </p>
                <div className="text-sm text-gray-500">
                  <p className="font-medium mb-2">Search Tips:</p>
                  <ul className="space-y-1">
                    <li>• Use specific keywords from your archives</li>
                    <li>• Try shorter search phrases</li>
                    <li>• Search for topics, names, or places</li>
                  </ul>
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* Empty State */}
      {!searched && !loading && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Sparkles size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Start Searching Your Archives
          </h3>
          <p className="text-gray-600 mb-4">
            Enter a query above to search through all your transcribed audio
          </p>
          <div className="text-sm text-gray-500 space-y-1">
            <p className="font-medium mb-2">Example searches:</p>
            <div className="inline-flex flex-wrap gap-2 justify-center">
              {['WWII', 'family history', 'grandmother', 'traditions', 'childhood'].map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setQuery(example)
                  }}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )}
