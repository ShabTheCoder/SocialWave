import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { api } from '../services/api';
import { PostCard } from './PostCard';
import { Post, UserProfile } from '../types';
import { 
  Calendar, 
  MapPin, 
  Link as LinkIcon, 
  Edit3, 
  Check, 
  X, 
  UserPlus, 
  UserMinus,
  ArrowLeft,
  Users,
  Camera,
  Trash2,
  AlertCircle,
  RefreshCcw,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, formatDistanceToNow } from 'date-fns';

import { Modal } from './Modal';

export const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [currentUser] = useAuthState(auth);
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (userId) {
      setLoadingUser(true);
      api.getUser(userId)
        .then(data => {
          setUserData(data);
          if (data) {
            setBio(data.bio || '');
            setDisplayName(data.displayName || '');
            setPhotoURL(data.photoURL || '');
          }
        })
        .catch(console.error)
        .finally(() => setLoadingUser(false));

      setLoadingPosts(true);
      api.getPosts() // Filter by authorId in a real app
        .then(allPosts => {
          setPosts(allPosts.filter(p => p.authorId === userId));
        })
        .catch(console.error)
        .finally(() => setLoadingPosts(false));
    }
  }, [userId]);

  const handleUpdateProfile = async () => {
    if (!currentUser || currentUser.uid !== userId || !displayName.trim()) return;
    setIsSaving(true);
    try {
      await updateProfile(currentUser, { displayName });
      await api.syncUser({
        id: userId,
        displayName,
        photoURL,
        email: currentUser.email || '',
        bio
      });
      setUserData(prev => prev ? { ...prev, displayName, photoURL, bio } : null);
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        console.error("Image too large");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser || currentUser.uid !== userId) return;
    setIsDeleting(true);
    try {
      // Simplified delete logic
      await auth.signOut();
      window.location.href = '/';
    } catch (error: any) {
      console.error('Error deleting account:', error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleMessage = () => {
    if (!currentUser || !userId || currentUser.uid === userId) return;
    navigate(`/messages/${userId}`);
  };

  if (loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900 dark:border-stone-50"></div>
        <p className="text-stone-400 font-medium animate-pulse">Catching the wave...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="text-center py-20 px-6 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm">
        <h2 className="text-3xl font-display font-bold text-stone-900 dark:text-stone-50 mb-4">User not found</h2>
        <Link to="/" className="px-8 py-3 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-full font-bold">Go back home</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] overflow-hidden border border-black/5 dark:border-white/5 shadow-sm">
        <div className="h-48 bg-stone-100 dark:bg-stone-800 relative">
          {/* Banner Placeholder */}
          <div className="absolute inset-0 bg-gradient-to-b from-stone-200/50 dark:from-stone-950/50 to-transparent"></div>
          
          <Link to="/" className="absolute top-6 left-6 p-2 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded-full text-stone-900 dark:text-stone-50 hover:bg-white dark:hover:bg-stone-900 transition-all shadow-sm">
            <ArrowLeft size={20} />
          </Link>
        </div>
        
        <div className="px-8 pb-8 relative">
          <div className="flex justify-between items-end -mt-16 mb-6">
            <div className="relative group shrink-0">
              <img 
                src={isEditing ? (photoURL || `https://ui-avatars.com/api/?name=${displayName}&size=256`) : (userData.photoURL || `https://ui-avatars.com/api/?name=${userData.displayName}&size=256`)} 
                alt={userData.displayName}
                className={`w-32 h-32 rounded-[2rem] border-4 border-white dark:border-stone-900 object-cover shadow-xl bg-white dark:bg-stone-900 ${isEditing ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                referrerPolicy="no-referrer"
                onClick={() => isEditing && document.getElementById('profile-pic-input')?.click()}
              />
              {isEditing && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/40 p-2 rounded-full text-white">
                    <Camera size={24} />
                  </div>
                </div>
              )}
              <input 
                id="profile-pic-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white dark:border-stone-900 rounded-full"></div>
            </div>
            
            <div className="flex gap-3">
              {currentUser?.uid === userId ? (
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-6 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-50 rounded-full text-sm font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-all flex items-center gap-2"
                >
                  {isEditing ? <X size={18} /> : <Edit3 size={18} />}
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleFollow}
                    className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-black/5 ${
                      isFollowing 
                        ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-50 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 group' 
                        : 'bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus size={18} />
                        <span className="group-hover:hidden">Following</span>
                        <span className="hidden group-hover:inline">Unfollow</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={18} />
                        Follow
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleMessage}
                    className="px-6 py-2.5 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 rounded-full border border-black/5 dark:border-white/5 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all shadow-lg shadow-black/5 flex items-center gap-2 font-bold text-sm"
                  >
                    <MessageCircle size={18} />
                    Message
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-3xl font-display font-bold text-stone-900 dark:text-stone-50">{userData.displayName}</h2>
              <p className="text-stone-400 dark:text-stone-500 font-medium">@{userData.displayName?.toLowerCase().replace(/\s+/g, '')}</p>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">Display Name</label>
                  <input 
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-black/5 dark:border-white/5 rounded-2xl px-4 py-3 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">Bio</label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell the world your story..."
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-black/5 dark:border-white/5 rounded-2xl p-4 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all min-h-[100px]"
                  />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <button 
                    onClick={handleUpdateProfile}
                    disabled={isSaving}
                    className="px-8 py-2.5 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-full text-sm font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white dark:border-stone-900/30 dark:border-t-stone-900 rounded-full animate-spin" />
                    ) : (
                      <Check size={18} />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  
                  <button 
                    onClick={() => setShowDeleteModal(true)}
                    disabled={isDeleting}
                    className="px-6 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full text-sm font-bold transition-all flex items-center gap-2"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {userData.bio ? (
                  <p className="text-stone-800 dark:text-stone-200 leading-relaxed text-xl max-w-2xl border-l-4 border-stone-200 dark:border-stone-700 pl-6 py-2">
                    {userData.bio}
                  </p>
                ) : (
                  <p className="text-stone-400 dark:text-stone-500 font-medium text-lg">
                    No bio yet. The wave is waiting for a story.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2 text-stone-400 dark:text-stone-500 text-sm">
                <Calendar size={16} />
                <span>Joined {userData.createdAt ? format(new Date(userData.createdAt), 'MMMM yyyy') : 'Recently'}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-400 dark:text-stone-500 text-sm">
                <Users size={16} />
                <span className="font-bold text-stone-900 dark:text-stone-50">0</span> Following
              </div>
              <div className="flex items-center gap-2 text-stone-400 dark:text-stone-500 text-sm">
                <Users size={16} />
                <span className="font-bold text-stone-900 dark:text-stone-50">0</span> Followers
              </div>
            </div>
            {/* Account Settings (Owner Only) */}
            {currentUser?.uid === userId && !isEditing && (
              <div className="pt-8 mt-8 border-t border-black/5 dark:border-white/5">
                <h3 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4">Account Settings</h3>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isDeleting}
                  className="px-6 py-2.5 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-2xl text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-all flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  <span>Delete Account</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Posts */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-4 flex-1">
            <h3 className="text-xl font-display font-bold text-stone-900 dark:text-stone-50">Waves</h3>
            <div className="h-px flex-1 bg-black/5 dark:bg-white/5"></div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="ml-4 p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 transition-colors"
            title="Refresh Waves"
          >
            <RefreshCcw size={18} />
          </button>
        </div>

        {loadingPosts ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-stone-900 rounded-3xl p-6 h-64 animate-pulse border border-black/5 dark:border-white/5" />
          ))
        ) : posts.length > 0 ? (
          <div className="space-y-8">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-black/5 dark:border-white/5 border-dashed">
            <p className="text-stone-400 dark:text-stone-500 font-medium text-lg">No waves yet. The ocean is still.</p>
          </div>
        )}
      </div>
      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Delete Account"
        type="danger"
        footer={
          <>
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
              className="px-6 py-2 text-stone-500 font-bold hover:text-stone-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="px-6 py-2 bg-rose-600 text-white rounded-full font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              Confirm Delete
            </button>
          </>
        }
      >
        <p>Are you absolutely sure? This will delete your profile and all your waves forever. This action cannot be undone.</p>
      </Modal>
    </div>
  );
};
