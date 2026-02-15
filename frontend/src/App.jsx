import { useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
// import RightSidebar from './components/RightSidebar'
import Feed from './pages/Feed'
import CreatePost from './pages/CreatePost'
import History from './pages/History'
import Settings from './pages/Settings'

export default function App() {
  const [activeTab, setActiveTab] = useState('feed')
  const [searchQuery, setSearchQuery] = useState('')

  // Mock user data
  const user = {
    initials: 'JD',
    name: 'John Doe',
    role: 'Oral Historian',
    location: 'San Francisco, CA',
    stats: {
      posts: 127,
      listeners: '2.4k',
      following: 89
    }
  }

  // Mock trending topics
  const trendingTopics = [
    { name: 'Historical Events', count: '1.2k', growth: 23 },
    { name: 'Family Stories', count: '892', growth: 18 },
    { name: 'Cultural Heritage', count: '654', growth: 12 },
  ]

  // Mock posts data
  const posts = [
    {
      id: 1,
      user: {
        name: 'Diana Martinez',
        initials: 'DM',
        avatarColor: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
      },
      title: "My Grandmother's Journey Through WWII",
      timeAgo: '2 hours ago',
      categories: [
        { name: 'Historical Events', color: 'yellow' },
        { name: 'Personal Stories', color: 'blue' }
      ],
      audio: {
        currentTime: '2:34',
        duration: '7:52',
        progress: 33
      },
      transcript: '"I remember the day clearly, despite all these years. We were living in a small village outside Warsaw when the news came. My mother gathered us all together and told us we had to leave everything behind..."',
      likes: 248,
      comments: 32
    },
    {
      id: 2,
      user: {
        name: 'Robert Miller',
        initials: 'RM',
        avatarColor: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)'
      },
      title: 'Traditional Music of the Appalachian Mountains',
      timeAgo: '5 hours ago',
      categories: [
        { name: 'Cultural Traditions', color: 'purple' },
        { name: 'Oral History', color: 'green' }
      ],
      audio: {
        currentTime: '4:15',
        duration: '8:30',
        progress: 50
      },
      transcript: '"This song has been passed down through five generations of our family. My great-great-grandfather used to play it on his banjo during summer evenings on the porch. The melody tells the story of..."',
      likes: 412,
      comments: 58
    },{
      id: 3,
      user: {
        name: 'Robert Miller',
        initials: 'RM',
        avatarColor: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)'
      },
      title: 'Traditional Music of the Appalachian Mountains',
      timeAgo: '5 hours ago',
      categories: [
        { name: 'Cultural Traditions', color: 'purple' },
        { name: 'Oral History', color: 'green' }
      ],
      audio: {
        currentTime: '4:15',
        duration: '8:30',
        progress: 50
      },
      transcript: '"This song has been passed down through five generations of our family. My great-great-grandfather used to play it on his banjo during summer evenings on the porch. The melody tells the story of..."',
      likes: 412,
      comments: 58
    }
  ]

  // Mock listening history
  const listeningHistory = [
    {
      id: 1,
      title: "My Grandmother's Journey Through WWII",
      user: { name: 'Diana Martinez', initials: 'DM', avatarColor: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' },
      listenedAt: '2 hours ago',
      duration: '7:52',
      progress: 100,
      completed: true
    },
    {
      id: 2,
      title: 'Traditional Music of the Appalachian Mountains',
      user: { name: 'Robert Miller', initials: 'RM', avatarColor: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)' },
      listenedAt: '1 day ago',
      duration: '8:30',
      progress: 75,
      completed: false
    }
  ]

  // Mock search history
  const searchHistory = [
    { id: 1, query: 'WWII stories', searchedAt: '2 hours ago' },
    { id: 2, query: 'traditional music', searchedAt: '1 day ago' },
    { id: 3, query: 'family history', searchedAt: '3 days ago' }
  ]

  // Render current page
  const renderPage = () => {
    switch (activeTab) {
      case 'create':
        return <CreatePost onSubmit={(data) => console.log('Post created:', data)} />
      case 'history':
        return <History listeningHistory={listeningHistory} searchHistory={searchHistory} />
      case 'settings':
        return <Settings onUpdate={(settings) => console.log('Settings updated:', settings)} />
      default:
        return <Feed posts={posts} />
    }
  }

  return (
    <div className="h-screen bg-gray-50 text-gray-800 flex flex-col overflow-hidden">
      <Header onSearch={setSearchQuery} />

      <div className="flex-1 flex overflow-hidden max-w-[1400px] mx-auto w-full">
        <Sidebar user={user} activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 overflow-y-auto p-6">
          {renderPage()}
        </main>

        {/* <RightSidebar trendingTopics={trendingTopics} /> */}
      </div>
    </div>
  )
}
