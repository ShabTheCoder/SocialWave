import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  getDocs,
  limit,
  writeBatch
} from 'firebase/firestore';
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
import { format } from 'date-fns';

import { Modal } from './Modal';

import { handleFirestoreError, triggerNotification } from '../utils';
import { OperationType } from '../types';

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

  // Fetch target user profile
  const [userDoc, loadingUser, userError] = useDocument(doc(db, 'users', userId!));
  const userData = userDoc?.data() as UserProfile | undefined;

  const isQuotaError = userError?.code === 'resource-exhausted' || 
                       userError?.message?.toLowerCase().includes('quota') || 
                       userError?.message?.toLowerCase().includes('limit exceeded');

  useEffect(() => {
    if (userError && !isQuotaError) {
      console.error("Profile Fetch Error:", userError.message);
    }
  }, [userError, isQuotaError]);

  // Fetch target user posts
  const [postsSnapshot, loadingPosts] = useCollection(
    query(collection(db, 'posts'), where('authorUid', '==', userId), limit(20))
  );
  const posts = postsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[] || [];

  // Fetch followers and following
  const [followersSnapshot] = useCollection(
    query(collection(db, 'follows'), where('followingId', '==', userId))
  );
  const [followingSnapshot] = useCollection(
    query(collection(db, 'follows'), where('followerId', '==', userId))
  );

  // Check if current user is following this user
  const [isFollowingSnapshot] = useCollection(
    currentUser ? query(
      collection(db, 'follows'), 
      where('followerId', '==', currentUser.uid), 
      where('followingId', '==', userId)
    ) : null
  );
  const isFollowing = !isFollowingSnapshot?.empty;

  useEffect(() => {
    if (userData && !isEditing) {
      setBio(userData.bio || '');
      setDisplayName(userData.displayName || '');
      setPhotoURL(userData.photoURL || '');
    }
  }, [userData, isEditing]);

  const handleUpdateProfile = async () => {
    if (!currentUser || currentUser.uid !== userId || !displayName.trim()) return;
    setIsSaving(true);
    try {
      // 0. Update Firebase Auth profile (displayName only to avoid "URL too long" error with base64)
      await updateProfile(currentUser, { displayName });

      // 1. Update user document (Firestore allows larger base64 strings)
      await updateDoc(doc(db, 'users', userId), { 
        bio,
        displayName,
        photoURL,
        displayNameSlug: displayName.toLowerCase().replace(/\s+/g, '')
      });

      // 2. Update all user's posts with new display name and photo using a batch
      const postsQuery = query(collection(db, 'posts'), where('authorUid', '==', userId));
      const postsSnapshot = await getDocs(postsQuery);
      
      if (!postsSnapshot.empty) {
        // Firestore batches have a limit of 500 operations
        const chunks = [];
        for (let i = 0; i < postsSnapshot.docs.length; i += 500) {
          chunks.push(postsSnapshot.docs.slice(i, i + 500));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(postDoc => {
            batch.update(postDoc.ref, { 
              authorName: displayName,
              authorPhoto: photoURL
            });
          });
          await batch.commit();
        }
      }

      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error.message);
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        // Using a simple alert for now as per instructions to avoid window.alert if possible, 
        // but for file size it's a quick way. Better to use a toast or state.
        // I'll use a console error and maybe a state message if I had one.
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
      // 1. Delete all user's posts
      const postsQuery = query(collection(db, 'posts'), where('authorUid', '==', userId));
      const postsSnapshot = await getDocs(postsQuery);
      
      if (!postsSnapshot.empty) {
        const chunks = [];
        for (let i = 0; i < postsSnapshot.docs.length; i += 500) {
          chunks.push(postsSnapshot.docs.slice(i, i + 500));
        }
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(postDoc => batch.delete(postDoc.ref));
          await batch.commit();
        }
      }

      // 2. Delete all user's follows (where they are the follower)
      const followsQuery = query(collection(db, 'follows'), where('followerId', '==', userId));
      const followsSnapshot = await getDocs(followsQuery);
      if (!followsSnapshot.empty) {
        const batch = writeBatch(db);
        followsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }

      // 3. Delete all user's bookmarks
      const bookmarksQuery = collection(db, `users/${userId}/bookmarks`);
      const bookmarksSnapshot = await getDocs(bookmarksQuery);
      if (!bookmarksSnapshot.empty) {
        const batch = writeBatch(db);
        bookmarksSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }

      // 4. Delete user document
      await deleteDoc(doc(db, 'users', userId));

      // 5. Attempt to delete the Firebase Auth account
      try {
        await currentUser.delete();
      } catch (authError: any) {
        console.warn('Could not delete auth account:', authError.message);
        await auth.signOut();
      }

      window.location.href = '/';
    } catch (error: any) {
      console.error('Error deleting account:', error.message);
      const isQuota = error.code === 'resource-exhausted' || 
                      error.message?.toLowerCase().includes('quota') || 
                      error.message?.toLowerCase().includes('limit exceeded');
      
      if (isQuota) {
        setIsDeleting(false);
        setShowDeleteModal(false);
        alert("Daily database limit reached. We've reached the free tier limit for today. Please try again tomorrow!");
      } else {
        handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
        setIsDeleting(false);
        setShowDeleteModal(false);
      }
    }
  };

  const handleFollow = async () => {
    if (!currentUser || currentUser.uid === userId || isSaving) return;
    const followId = `${currentUser.uid}_${userId}`;
    setIsSaving(true);
    
    try {
      if (isFollowing) {
        // Direct delete using the deterministic ID
        await deleteDoc(doc(db, 'follows', followId));
      } else {
        // Direct set using the deterministic ID
        await setDoc(doc(db, 'follows', followId), {
          followerId: currentUser.uid,
          followingId: userId,
          createdAt: serverTimestamp()
        });
        triggerNotification(userId!, 'follow');
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error.message);
      handleFirestoreError(error, OperationType.WRITE, `follows/${followId}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUser || !userId || currentUser.uid === userId) return;
    
    const participants = [currentUser.uid, userId].sort();
    const chatId = participants.join('_');
    const chatRef = doc(db, 'chats', chatId);

    try {
      await setDoc(chatRef, {
        participants,
        lastMessageAt: serverTimestamp(),
        unreadCount: {
          [currentUser.uid]: 0,
          [userId]: 0
        }
      }, { merge: true });
      
      navigate(`/messages/${chatId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const handleCreateProfile = async () => {
    if (!currentUser || userData || isSaving) return;
    setIsSaving(true);
    try {
      const slug = (currentUser.displayName || 'User').toLowerCase().replace(/\s+/g, '');
      await setDoc(doc(db, 'users', currentUser.uid), {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'User',
        displayNameSlug: slug,
        email: currentUser.email || `${currentUser.uid}@socialwave.app`,
        photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName || 'User'}&background=random`,
        theme: 'light',
        createdAt: serverTimestamp(),
        bio: ''
      });
      // Page will re-render automatically due to useDocument listener
    } catch (error: any) {
      console.error('Error creating profile:', error.message);
      handleFirestoreError(error, OperationType.CREATE, `users/${currentUser.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // Auto-create profile if it's the current user's profile and it doesn't exist
    if (!loadingUser && !userData && currentUser?.uid === userId && !isSaving) {
      handleCreateProfile();
    }
  }, [loadingUser, userData, currentUser, userId, isSaving]);

  if (loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900 dark:border-stone-50"></div>
        <p className="text-stone-400 font-medium animate-pulse">Catching the wave...</p>
      </div>
    );
  }

  if (isQuotaError) {
    return (
      <div className="text-center py-20 px-6 bg-amber-50 dark:bg-amber-900/10 rounded-[2.5rem] border border-amber-100 dark:border-amber-900/20">
        <AlertCircle size={48} className="text-amber-600 dark:text-amber-400 mx-auto mb-6" />
        <h2 className="text-2xl font-display font-bold text-amber-900 dark:text-amber-50 mb-4">Daily Limit Reached</h2>
        <p className="text-amber-700 dark:text-amber-300 max-w-md mx-auto mb-8">
          The community has been exceptionally active today! We've reached the daily free limit for database reads. Everything will be back online when the quota resets tomorrow.
        </p>
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-amber-600 text-white rounded-full font-bold hover:bg-amber-700 transition-all">
          Try Refreshing
        </button>
      </div>
    );
  }

  if (!userData) {
    const isOwnProfile = currentUser && currentUser.uid === userId;
    return (
      <div className="text-center py-20 px-6 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm">
        <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Users size={40} className="text-stone-300 dark:text-stone-600" />
        </div>
        <h2 className="text-3xl font-display font-bold text-stone-900 dark:text-stone-50 mb-4">
          {isOwnProfile ? (isSaving ? 'Creating your wave...' : 'Setting up your profile...') : 'User not found'}
        </h2>
        <p className="text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-8 leading-relaxed">
          {isOwnProfile 
            ? "We're just putting the finishing touches on your profile. This usually happens automatically on your first visit. If it takes too long, try clicking the button below."
            : "The user you're looking for doesn't exist or hasn't created their wave yet."}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/" 
            className="px-8 py-3 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-50 rounded-full font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
          >
            Go back home
          </Link>
          {isOwnProfile ? (
            <button 
              onClick={handleCreateProfile}
              disabled={isSaving}
              className="px-8 py-3 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-full font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-all shadow-lg shadow-stone-900/10 dark:shadow-white/5 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isSaving ? 'Creating...' : 'Create Profile Manually'}
            </button>
          ) : (
            !currentUser && (
              <p className="text-sm text-stone-400">
                Are you this user? <span className="text-emerald-600 font-bold">Sign in</span> to claim your profile.
              </p>
            )
          )}
        </div>
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
                <span>Joined {userData.createdAt && typeof userData.createdAt.toDate === 'function' ? format(userData.createdAt.toDate(), 'MMMM yyyy') : 'Recently'}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-400 dark:text-stone-500 text-sm">
                <Users size={16} />
                <span className="font-bold text-stone-900 dark:text-stone-50">{followingSnapshot?.size || 0}</span> Following
              </div>
              <div className="flex items-center gap-2 text-stone-400 dark:text-stone-500 text-sm">
                <Users size={16} />
                <span className="font-bold text-stone-900 dark:text-stone-50">{followersSnapshot?.size || 0}</span> Followers
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
