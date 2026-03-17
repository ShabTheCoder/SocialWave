import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { auth, db } from './firebase';
import { collection, query, orderBy, limit, doc, where, getDocs, setDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { Auth } from './components/Auth';
import { CreatePost } from './components/CreatePost';
import { PostCard } from './components/PostCard';
import { ProfilePage } from './components/ProfilePage';
import { NotificationsPage } from './components/NotificationsPage';
import { MessagesPage } from './components/MessagesPage';
import { ChatRoom } from './components/ChatRoom';
import { HashtagPage } from './components/HashtagPage';
import { TrendingHashtags } from './components/TrendingHashtags';
import { TrendingPage } from './components/TrendingPage';
import { PullToRefresh } from './components/PullToRefresh';
import { Post } from './types';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { Moon, Sun, Waves, TrendingUp, Users, Bookmark, Settings, Bell, Search, Compass, AlertCircle, RefreshCcw, User as UserIcon, MessageSquare } from 'lucide-react';
import { Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from './utils';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SocialApp />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function SocialApp() {
  const [user, loadingAuth] = useAuthState(auth);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  console.log('Current theme in SocialApp:', theme);
  const location = useLocation();
  const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(25));
  const [postsSnapshot, loadingPosts, error] = useCollection(postsQuery);

  const isQuotaError = error?.code === 'resource-exhausted' || 
                       error?.message?.toLowerCase().includes('quota') || 
                       error?.message?.toLowerCase().includes('limit exceeded');

  const posts = postsSnapshot?.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Post[] || [];

  useEffect(() => {
    if (error && !isQuotaError) {
      console.error("Firestore Feed Error:", error.message);
    }
  }, [error, isQuotaError]);

  const [unreadNotifs] = useCollection(
    user ? query(collection(db, `users/${user.uid}/notifications`), where('read', '==', false), limit(1)) : null
  );
  const [unreadChats] = useCollection(
    user ? query(collection(db, 'chats'), where('participants', 'array-contains', user.uid), limit(50)) : null
  );

  const hasUnreadNotifs = unreadNotifs && unreadNotifs.size > 0;
  const hasUnreadMessages = unreadChats?.docs.some(doc => {
    const data = doc.data();
    return data.unreadCount?.[user?.uid || ''] > 0;
  });

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center gap-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Waves className="w-12 h-12 text-[var(--color-text-main)]" />
          </motion.div>
          <p className="text-stone-400 font-medium text-lg">SocialWave is waking up...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)] font-sans selection:bg-stone-200 dark:selection:bg-stone-800 transition-colors duration-300">
      {/* Quota Warning Banner */}
      {isQuotaError && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-xs font-bold tracking-widest uppercase z-[100] sticky top-0 flex items-center justify-center gap-2">
          <AlertCircle size={14} />
          <span>Read-Only Mode: Daily database limit reached. We'll be back to full power tomorrow!</span>
        </div>
      )}
      
      {/* Header */}
      <header className="sticky top-0 z-50 glass-morphism border-b border-black/5 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group cursor-pointer">
              <div className="bg-stone-900 dark:bg-stone-50 p-1.5 rounded-lg transition-transform group-hover:scale-110">
                <Waves className="text-white dark:text-stone-900" size={20} />
              </div>
              <h1 className="text-xl font-display font-bold tracking-tight text-stone-900 dark:text-stone-50">SocialWave</h1>
            </Link>

            <div className="hidden md:flex items-center bg-stone-100 dark:bg-stone-900 rounded-full px-4 py-1.5 gap-2 w-64 border border-black/5 dark:border-white/5 focus-within:bg-white dark:focus-within:bg-stone-800 focus-within:ring-2 focus-within:ring-black/5 transition-all">
              <Search size={16} className="text-stone-400" />
              <input 
                type="text" 
                placeholder="Search Wave..." 
                className="bg-transparent border-none text-sm focus:ring-0 w-full placeholder:text-stone-400 text-stone-900 dark:text-stone-50"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 transition-colors"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            {user && (
              <Link 
                to={`/profile/${user.uid}`}
                className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 transition-colors lg:hidden"
                title="My Profile"
              >
                <UserIcon size={20} />
              </Link>
            )}
            <Link 
              to="/notifications"
              className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 transition-colors relative"
            >
              <Bell size={20} />
              {hasUnreadNotifs && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-stone-950"></span>
              )}
            </Link>
            <Auth />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-10 pb-24 lg:pb-8">
        {/* Sidebar Left */}
        <aside className="hidden lg:block lg:col-span-3 space-y-8 sticky top-24 h-fit">
          <div className="space-y-1">
            <SidebarItem to="/" icon={<Compass size={20} />} label="Explore" active={location.pathname === '/'} />
            <SidebarItem to="/discover" icon={<Search size={20} />} label="Discover" active={location.pathname === '/discover'} />
            <SidebarItem 
              to="/notifications" 
              icon={<Bell size={20} />} 
              label="Notifications" 
              active={location.pathname === '/notifications'} 
              badge={hasUnreadNotifs}
            />
            <SidebarItem 
              to="/messages" 
              icon={<MessageSquare size={20} />} 
              label="Messages" 
              active={location.pathname.startsWith('/messages')} 
              badge={hasUnreadMessages}
            />
            <SidebarItem to="/trending" icon={<TrendingUp size={20} />} label="Trending" active={location.pathname === '/trending'} />
            {user && (
              <SidebarItem to="/bookmarks" icon={<Bookmark size={20} />} label="Bookmarks" active={location.pathname === '/bookmarks'} />
            )}
            {user && (
              <SidebarItem 
                to={`/profile/${user.uid}`} 
                icon={<UserIcon size={20} />} 
                label="My Profile" 
                active={location.pathname === `/profile/${user.uid}`} 
              />
            )}
            <SidebarItem to="#" icon={<Users size={20} />} label="Communities" />
            <SidebarItem to="#" icon={<Settings size={20} />} label="Settings" />
          </div>

          <div className="p-6 bg-stone-900 dark:bg-stone-50 rounded-3xl text-white dark:text-stone-900 space-y-4 shadow-xl shadow-stone-900/10 dark:shadow-white/5">
            <h4 className="font-display font-bold text-lg leading-tight">Join the Wave Premium</h4>
            <p className="text-stone-400 dark:text-stone-500 text-xs leading-relaxed">Get verified, enjoy ad-free experience and exclusive features.</p>
            <button className="w-full py-2 bg-white dark:bg-stone-900 text-stone-900 dark:text-white rounded-full text-sm font-bold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              Upgrade Now
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-6 space-y-8">
          <Routes>
            <Route path="/" element={<Feed posts={posts} loading={loadingPosts} error={error} />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:chatId" element={<ChatRoom />} />
            <Route path="/hashtag/:tag" element={<HashtagPage />} />
          </Routes>
        </div>

        {/* Sidebar Right */}
        <aside className="hidden lg:block lg:col-span-3 space-y-8 sticky top-24 h-fit">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
            <h3 className="font-display font-bold text-xl text-stone-900 dark:text-stone-50 mb-6">Who to follow</h3>
            <div className="space-y-6">
              <WhoToFollow currentUserId={user?.uid} isQuotaError={isQuotaError} />
            </div>
          </div>

          <TrendingHashtags />

          <GlobalActivity />
          
          <div className="px-6 space-y-4">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] uppercase tracking-widest font-bold text-stone-300 dark:text-stone-600">
              <a href="#" className="hover:text-stone-500 transition-colors">Privacy</a>
              <a href="#" className="hover:text-stone-500 transition-colors">Terms</a>
              <a href="#" className="hover:text-stone-500 transition-colors">Cookies</a>
              <a href="#" className="hover:text-stone-500 transition-colors">Ads Info</a>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-stone-200 dark:text-stone-800">© 2026 SocialWave Inc.</p>
          </div>
        </aside>
        {/* Mobile Nav */}
        <MobileNav user={user} location={location} />
      </main>
    </div>
  );
}

function MobileNav({ user, location }: { user: any, location: any }) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-t border-black/5 dark:border-white/5 px-6 py-3 z-40 flex items-center justify-around shadow-2xl shadow-black/10">
      <Link to="/" className={`p-2 rounded-2xl transition-all ${location.pathname === '/' ? 'bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 shadow-lg shadow-stone-900/20 dark:shadow-white/10' : 'text-stone-400'}`}>
        <Compass size={24} />
      </Link>
      <Link to="/discover" className={`p-2 rounded-2xl transition-all ${location.pathname === '/discover' ? 'bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 shadow-lg shadow-stone-900/20 dark:shadow-white/10' : 'text-stone-400'}`}>
        <Search size={24} />
      </Link>
      <Link to="/trending" className={`p-2 rounded-2xl transition-all ${location.pathname === '/trending' ? 'bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 shadow-lg shadow-stone-900/20 dark:shadow-white/10' : 'text-stone-400'}`}>
        <TrendingUp size={24} />
      </Link>
      {user ? (
        <>
          <Link to="/messages" className={`p-2 rounded-2xl transition-all ${location.pathname.startsWith('/messages') ? 'bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 shadow-lg shadow-stone-900/20 dark:shadow-white/10' : 'text-stone-400'}`}>
            <MessageSquare size={24} />
          </Link>
          <Link to="/bookmarks" className={`p-2 rounded-2xl transition-all ${location.pathname === '/bookmarks' ? 'bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 shadow-lg shadow-stone-900/20 dark:shadow-white/10' : 'text-stone-400'}`}>
            <Bookmark size={24} />
          </Link>
          <Link to={`/profile/${user.uid}`} className={`p-2 rounded-2xl transition-all ${location.pathname === `/profile/${user.uid}` ? 'bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 shadow-lg shadow-stone-900/20 dark:shadow-white/10' : 'text-stone-400'}`}>
            <UserIcon size={24} />
          </Link>
        </>
      ) : (
        <div className="flex items-center">
          <Auth />
        </div>
      )}
    </div>
  );
}

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: boolean;
}

function Feed({ posts, loading, error }: { posts: Post[], loading: boolean, error?: any }) {
  const [user] = useAuthState(auth);
  const isQuotaError = error?.code === 'resource-exhausted' || 
                       error?.message?.toLowerCase().includes('quota') || 
                       error?.message?.toLowerCase().includes('limit exceeded');
  
  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-8">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400">Live Feed</span>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-300 hover:text-stone-900 transition-colors flex items-center gap-2"
        >
          <RefreshCcw size={12} />
          Refresh
        </button>
      </div>
      
      {user && <CreatePost />}
      
      <div className="space-y-8">
        {error ? (
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-12 text-center border border-red-100 dark:border-red-900/30 shadow-sm">
            <div className="bg-red-50 dark:bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-red-600 dark:text-red-400 w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 dark:text-stone-50 mb-2">
              {isQuotaError ? 'Daily Limit Reached' : 'Feed Connection Error'}
            </h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">
              {isQuotaError
                ? "The community has been very active! We've reached the daily limit for the free database. The feed will be back online tomorrow." 
                : error.message}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-full font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-stone-900 rounded-3xl p-6 h-72 animate-pulse border border-black/5 dark:border-white/5" />
          ))
        ) : posts && posts.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <PostCard post={post} />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-24 bg-white dark:bg-stone-900 rounded-3xl border border-black/5 dark:border-white/5 border-dashed">
            <div className="max-w-xs mx-auto space-y-4">
              <div className="bg-stone-50 dark:bg-stone-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Compass className="text-stone-300 dark:text-stone-600 w-8 h-8" />
              </div>
              <p className="text-stone-400 dark:text-stone-500 font-medium text-lg">The wave is calm... be the first to ripple.</p>
              {!user && (
                <div className="pt-4">
                  <Auth />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}

function DiscoverPage() {
  const usersQuery = query(collection(db, 'users'), limit(50));
  const [snapshot, loading] = useCollection(usersQuery);
  const users = snapshot?.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as any[] || [];
  const [currentUser] = useAuthState(auth);

  return (
    <div className="space-y-8">
      <div className="px-4">
        <h2 className="text-2xl font-display font-bold text-stone-900 dark:text-stone-50">Discover People</h2>
        <p className="text-stone-400 text-sm">Find other ripples in the ocean</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-stone-100 dark:bg-stone-900 rounded-3xl animate-pulse" />
          ))
        ) : users.length > 0 ? (
          users.filter(u => u.uid !== currentUser?.uid).map(user => (
            <div key={user.uid} className="bg-white dark:bg-stone-900 p-4 rounded-3xl border border-black/5 dark:border-white/5 flex items-center justify-between group hover:shadow-lg transition-all">
              <Link to={`/profile/${user.uid}`} className="flex items-center gap-3 flex-1 min-w-0">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                  className="w-12 h-12 rounded-2xl object-cover" 
                  referrerPolicy="no-referrer"
                />
                <div className="truncate">
                  <p className="font-bold text-stone-900 dark:text-stone-50 truncate">{user.displayName}</p>
                  <p className="text-xs text-stone-400 truncate">@{user.displayName?.toLowerCase().replace(/\s+/g, '')}</p>
                </div>
              </Link>
              <Link 
                to={`/profile/${user.uid}`}
                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-50 rounded-full text-xs font-bold hover:bg-stone-900 dark:hover:bg-stone-50 hover:text-white dark:hover:text-stone-900 transition-all"
              >
                Profile
              </Link>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-stone-400">
            No other users found yet.
          </div>
        )}
      </div>
    </div>
  );
}

function BookmarksPage() {
  const [user] = useAuthState(auth);
  const [bookmarksSnapshot, loadingBookmarks] = useCollection(
    user ? query(collection(db, `users/${user.uid}/bookmarks`), orderBy('createdAt', 'desc'), limit(20)) : null
  );
  
  const bookmarkedPostIds = bookmarksSnapshot?.docs.map(doc => doc.data().postId) || [];
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      if (bookmarkedPostIds.length === 0) {
        setPosts([]);
        return;
      }
      setLoadingPosts(true);
      try {
        // Firestore 'in' query limit is 10
        const chunks = [];
        for (let i = 0; i < bookmarkedPostIds.length; i += 10) {
          chunks.push(bookmarkedPostIds.slice(i, i + 10));
        }

        const allPosts: Post[] = [];
        for (const chunk of chunks) {
          const q = query(collection(db, 'posts'), where('__name__', 'in', chunk));
          const snap = await getDocs(q);
          snap.docs.forEach(doc => allPosts.push({ id: doc.id, ...doc.data() } as Post));
        }
        
        // Sort by bookmark creation date (approximate since we don't have it easily here, 
        // or we could fetch bookmarks and posts separately and join)
        setPosts(allPosts);
      } catch (err: any) {
        console.error("Error fetching bookmarked posts:", err.message);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [bookmarkedPostIds.join(',')]);

  if (!user) return <div className="text-center py-20">Please sign in to view bookmarks</div>;

  return (
    <div className="space-y-8">
      <div className="px-4">
        <h2 className="text-2xl font-display font-bold text-stone-900 dark:text-stone-50">Your Bookmarks</h2>
        <p className="text-stone-400 text-sm">Waves you've saved for later</p>
      </div>
      <div className="space-y-8">
        {loadingBookmarks || loadingPosts ? (
          <div className="animate-pulse space-y-8">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-stone-100 dark:bg-stone-900 rounded-[2rem]" />)}
          </div>
        ) : posts.length > 0 ? (
          posts.map(post => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="text-center py-20 bg-stone-50 dark:bg-stone-900/50 rounded-[3rem] border border-dashed border-stone-200 dark:border-stone-800">
            <Bookmark className="w-12 h-12 text-stone-200 dark:text-stone-800 mx-auto mb-4" />
            <p className="text-stone-400 font-medium">No bookmarks yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarItem({ to, icon, label, active = false, badge = false }: SidebarItemProps) {
  return (
    <Link to={to} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-semibold transition-all group relative ${
      active ? 'bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 shadow-lg shadow-stone-900/10 dark:shadow-white/5' : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900 hover:text-stone-900 dark:hover:text-stone-50'
    }`}>
      <span className={`${active ? 'text-white dark:text-stone-900' : 'text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-50'} transition-colors`}>
        {icon}
      </span>
      <span className="text-sm">{label}</span>
      {badge && (
        <span className="absolute right-4 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-stone-900"></span>
      )}
    </Link>
  );
}

function WhoToFollow({ currentUserId, isQuotaError }: { currentUserId?: string, isQuotaError?: boolean }) {
  const navigate = useNavigate();
  const usersQuery = query(collection(db, 'users'), limit(5));
  const [usersSnapshot, loading] = useCollection(isQuotaError ? null : usersQuery);
  
  const users = usersSnapshot?.docs
    .map(doc => ({ uid: doc.id, ...doc.data() } as any))
    .filter(u => u.uid !== currentUserId)
    .slice(0, 3);

  if (isQuotaError) return null;
  if (loading) return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-12 bg-stone-50 dark:bg-stone-900 rounded-xl" />)}</div>;
  if (!users || users.length === 0) return <p className="text-xs text-stone-400 italic">No suggestions yet</p>;

  const handleMessage = async (userId: string) => {
    if (!currentUserId || !userId || currentUserId === userId) return;
    
    const participants = [currentUserId, userId].sort();
    const chatId = participants.join('_');
    const chatRef = doc(db, 'chats', chatId);

    try {
      await setDoc(chatRef, {
        participants,
        lastMessageAt: serverTimestamp(),
        unreadCount: {
          [currentUserId]: 0,
          [userId]: 0
        }
      }, { merge: true });
      
      navigate(`/messages/${chatId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  return (
    <div className="space-y-4">
      {users.map((user: any) => (
        <div key={user.uid} className="flex items-center justify-between group cursor-pointer">
          <Link to={`/profile/${user.uid}`} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-black/5 dark:border-white/5 overflow-hidden transition-transform group-hover:scale-105 flex-shrink-0">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`} 
                alt={user.displayName} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="truncate">
              <p className="text-sm font-bold text-stone-900 dark:text-stone-50 leading-none mb-1 truncate">{user.displayName}</p>
              <p className="text-xs text-stone-400 dark:text-stone-500 font-medium truncate">@{user.displayName?.toLowerCase().replace(/\s+/g, '')}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 ml-2">
            <button 
              onClick={() => handleMessage(user.uid)}
              className="p-2 bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-emerald-500 rounded-full transition-all"
              title="Message"
            >
              <MessageSquare size={16} />
            </button>
            <Link 
              to={`/profile/${user.uid}`}
              className="px-4 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-50 rounded-full text-xs font-bold hover:bg-stone-900 dark:hover:bg-stone-50 hover:text-white dark:hover:text-stone-900 transition-all"
            >
              View
            </Link>
          </div>
        </div>
      ))}
      <Link to="/discover" className="block text-center text-[10px] font-bold text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 transition-colors pt-2 uppercase tracking-widest">
        Discover more people
      </Link>
    </div>
  );
}

function GlobalActivity() {
  const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(5));
  const [snapshot] = useCollection(postsQuery);
  const posts = snapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[] || [];

  if (posts.length === 0) return null;

  return (
    <div className="bg-stone-900 dark:bg-stone-50 rounded-[2.5rem] p-6 text-white dark:text-stone-900 space-y-6">
      <div className="flex items-center gap-2 px-2">
        <Waves size={18} className="opacity-50" />
        <h3 className="font-display font-bold">Recent Ripples</h3>
      </div>
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="flex gap-3 items-start">
            <img src={post.authorPhoto} className="w-6 h-6 rounded-lg object-cover" referrerPolicy="no-referrer" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold opacity-80 truncate">{post.authorName}</p>
              <p className="text-[10px] opacity-50 line-clamp-1">{post.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
