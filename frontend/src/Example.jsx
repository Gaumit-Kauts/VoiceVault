import { Search, User, Play, Archive, History, Settings, Volume2, Heart, MessageCircle, Share2, Bookmark, MoreVertical } from 'lucide-react'

export default function App() {
  return (
    <div className="h-screen bg-[#27282a] text-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-[#27282a] border-b border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-6">
          {/* Left: Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 bg-[#f4b840] rounded-lg flex items-center justify-center">
              <Volume2 size={18} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-200">VoiceVault</h1>
          </div>

          {/* Center: Search Bar */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search archives, stories, history..."
                className="w-full bg-[#1f2022] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#f4b840] focus:border-transparent"
              />
            </div>
          </div>

          {/* Right: Login */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button className="bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] px-4 py-2 rounded text-sm font-medium flex items-center gap-2">
              <User size={16} />
              Log In
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden max-w-[1400px] mx-auto w-full">
        {/* Sidebar - Profile */}
        <aside className="w-64 bg-[#27282a] border-r border-gray-700 p-6 hidden md:block flex-shrink-0 overflow-y-auto">
          <div className="sticky top-6">
            {/* Profile Image */}
            <div className="w-32 h-32 bg-gradient-to-br from-[#f4b840] to-[#e5a930] rounded-full flex items-center justify-center text-[#1a1a1a] font-bold text-4xl mx-auto mb-4">
              JD
            </div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-200 mb-1">John Doe</h2>
              <p className="text-sm text-gray-400">Oral Historian</p>
              <p className="text-xs text-gray-500 mt-2">San Francisco, CA</p>
            </div>

            {/* Navigation */}
            <div className="space-y-2 mb-6">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-200 bg-gray-800 hover:bg-gray-750 transition-colors">
                <Play size={18} />
                <span>Post to Archive</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                <Archive size={18} />
                <span>Posted Archives</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                <History size={18} />
                <span>History</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                <Settings size={18} />
                <span>Settings</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-[#1f2022] rounded border border-gray-700">
              <div className="text-center">
                <div className="text-base font-semibold text-gray-200">127</div>
                <div className="text-xs text-gray-500">Posts</div>
              </div>
              <div className="text-center border-x border-gray-700">
                <div className="text-base font-semibold text-gray-200">2.4k</div>
                <div className="text-xs text-gray-500">Listeners</div>
              </div>
              <div className="text-center">
                <div className="text-base font-semibold text-gray-200">89</div>
                <div className="text-xs text-gray-500">Following</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content - Feed */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Audio Post Card */}
            <article className="bg-[#1f2022] rounded-lg border border-gray-700 overflow-hidden">
              {/* Post Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      DM
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-200">Diana Martinez</span>
                        <span className="text-gray-500 text-sm">• 2 hours ago</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-[#f4b840]/10 text-[#f4b840] rounded border border-[#f4b840]/20">Historical Events</span>
                        <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">Personal Stories</span>
                      </div>
                    </div>
                  </div>
                  <button className="text-gray-500 hover:text-gray-300">
                    <MoreVertical size={18} />
                  </button>
                </div>

                <h3 className="text-lg font-semibold text-gray-200 mb-3">My Grandmother's Journey Through WWII</h3>

                {/* Audio Player */}
                <div className="bg-[#27282a] rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-4 mb-3">
                    <button className="w-10 h-10 bg-[#f4b840] hover:bg-[#e5a930] rounded-full flex items-center justify-center text-[#1a1a1a]">
                      <Play size={16} fill="currentColor" />
                    </button>
                    <div className="flex-1">
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
                        <div className="h-full w-1/3 bg-[#f4b840] rounded-full"></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>2:34</span>
                        <span>7:52</span>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-200">
                      <Volume2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Transcription Preview */}
                <div className="mt-4 p-4 bg-[#27282a] rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">
                    "I remember the day clearly, despite all these years. We were living in a small village outside Warsaw when the news came. My mother gathered us all together and told us we had to leave everything behind..."
                  </p>
                  <button className="text-xs text-[#f4b840] hover:text-[#e5a930] mt-2 font-medium">
                    Read full transcript →
                  </button>
                </div>
              </div>

              {/* Post Actions */}
              <div className="px-6 py-4 border-t border-gray-700 flex items-center gap-6">
                <button className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm">
                  <Heart size={18} />
                  <span>248</span>
                </button>
                <button className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm">
                  <MessageCircle size={18} />
                  <span>32</span>
                </button>
                <button className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm">
                  <Share2 size={18} />
                  <span>Share</span>
                </button>
                <button className="ml-auto text-gray-400 hover:text-gray-200">
                  <Bookmark size={18} />
                </button>
              </div>
            </article>

            {/* Second Audio Post Card */}
            <article className="bg-[#1f2022] rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      RM
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-200">Robert Miller</span>
                        <span className="text-gray-500 text-sm">• 5 hours ago</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded border border-purple-500/20">Cultural Traditions</span>
                        <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded border border-green-500/20">Oral History</span>
                      </div>
                    </div>
                  </div>
                  <button className="text-gray-500 hover:text-gray-300">
                    <MoreVertical size={18} />
                  </button>
                </div>

                <h3 className="text-lg font-semibold text-gray-200 mb-3">Traditional Music of the Appalachian Mountains</h3>

                <div className="bg-[#27282a] rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-4 mb-3">
                    <button className="w-10 h-10 bg-[#f4b840] hover:bg-[#e5a930] rounded-full flex items-center justify-center text-[#1a1a1a]">
                      <Play size={16} fill="currentColor" />
                    </button>
                    <div className="flex-1">
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
                        <div className="h-full w-1/2 bg-[#f4b840] rounded-full"></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>4:15</span>
                        <span>8:30</span>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-200">
                      <Volume2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-[#27282a] rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">
                    "This song has been passed down through five generations of our family. My great-great-grandfather used to play it on his banjo during summer evenings on the porch. The melody tells the story of..."
                  </p>
                  <button className="text-xs text-[#f4b840] hover:text-[#e5a930] mt-2 font-medium">
                    Read full transcript →
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-700 flex items-center gap-6">
                <button className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm">
                  <Heart size={18} />
                  <span>412</span>
                </button>
                <button className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm">
                  <MessageCircle size={18} />
                  <span>58</span>
                </button>
                <button className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm">
                  <Share2 size={18} />
                  <span>Share</span>
                </button>
                <button className="ml-auto text-gray-400 hover:text-gray-200">
                  <Bookmark size={18} />
                </button>
              </div>
            </article>

          </div>
        </main>

        {/* Right Sidebar - Trending */}
        <aside className="w-64 bg-[#27282a] border-l border-gray-700 p-4 hidden lg:block overflow-y-auto">
          <div className="sticky top-4 space-y-6">

            {/* Trending Categories */}
            <div className="bg-[#1f2022] rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-200 mb-3">Trending Topics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded hover:bg-gray-800 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Historical Events</p>
                    <p className="text-xs text-gray-500">1.2k new stories</p>
                  </div>
                  <div className="text-xs text-[#f4b840] font-semibold">↑ 23%</div>
                </div>
                <div className="flex items-center justify-between p-2 rounded hover:bg-gray-800 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Family Stories</p>
                    <p className="text-xs text-gray-500">892 new stories</p>
                  </div>
                  <div className="text-xs text-green-400 font-semibold">↑ 18%</div>
                </div>
                <div className="flex items-center justify-between p-2 rounded hover:bg-gray-800 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Cultural Heritage</p>
                    <p className="text-xs text-gray-500">654 new stories</p>
                  </div>
                  <div className="text-xs text-blue-400 font-semibold">↑ 12%</div>
                </div>
              </div>
            </div>

            {/* Suggested Follows */}
            <div className="bg-[#1f2022] rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-200 mb-3">Suggested Historians</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    SL
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">Sarah Lewis</p>
                    <p className="text-xs text-gray-500">342 followers</p>
                  </div>
                  <button className="text-xs px-3 py-1 bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] rounded font-medium">
                    Follow
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    MK
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">Mike Kim</p>
                    <p className="text-xs text-gray-500">218 followers</p>
                  </div>
                  <button className="text-xs px-3 py-1 bg-[#f4b840] hover:bg-[#e5a930] text-[#1a1a1a] rounded font-medium">
                    Follow
                  </button>
                </div>
              </div>
            </div>

          </div>
        </aside>
      </div>
    </div>
  )
}
