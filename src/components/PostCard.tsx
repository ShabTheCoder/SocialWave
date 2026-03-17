import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, updateDoc, increment, deleteDoc, setDoc, serverTimestamp, collection, query, where, orderBy, addDoc } from 'firebase/firestore';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Send, Bookmark, Quote, BarChart2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post, Poll } from '../types';
import { handleFirestoreError, triggerNotification } from '../utils';
import { OperationType } from '../types';
import { useCollectionData, useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';

import { Modal } from './Modal';
import { CreatePost } from './CreatePost';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const navigate = useNavigate();
  // Optimized: Only listen to the current user's like status for this post
  const likeRef = auth.currentUser ? doc(db, `posts/${post.id}/likes`, auth.currentUser.uid) : null;
  const [likeDoc, loadingLike, likeError] = useDocument(likeRef);
  
  const bookmarkRef = auth.currentUser ? doc(db, `users/${auth.currentUser.uid}/bookmarks`, post.id) : null;
  const [bookmarkDoc, loadingBookmarks] = useDocument(bookmarkRef);
  
  const isLiked = !!likeDoc?.exists();
  const isBookmarked = !!bookmarkDoc?.exists();
  const [showOptions, setShowOptions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const [quotedPostDoc] = useDocument(
    (post.quotedPostId && !post.quotedPost) ? doc(db, 'posts', post.quotedPostId) : null
  );

  const [commentsSnapshot, loadingComments, commentsError] = useCollection(
    showComments ? query(collection(db, `posts/${post.id}/comments`), orderBy('createdAt', 'asc')) : null
  );

  const quotedPostData = quotedPostDoc?.exists() ? { id: quotedPostDoc.id, ...quotedPostDoc.data() } as Post : null;
  const displayQuotedPost = post.quotedPost || quotedPostData;

  useEffect(() => {
    const isQuotaError = (err: any) => err?.code === 'resource-exhausted' || err?.message?.includes('Quota exceeded');
    if (likeError && !isQuotaError(likeError)) console.error(`Like Status Error for post ${post.id}:`, likeError.message);
    if (commentsError && !isQuotaError(commentsError)) console.error(`Comments Error for post ${post.id}:`, commentsError.message);
  }, [likeError, commentsError, post.id]);

  const comments = commentsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];

  const handleMessage = async () => {
    if (!auth.currentUser || !post.authorUid || auth.currentUser.uid === post.authorUid) return;
    
    const participants = [auth.currentUser.uid, post.authorUid].sort();
    const chatId = participants.join('_');
    const chatRef = doc(db, 'chats', chatId);

    try {
      await setDoc(chatRef, {
        participants,
        lastMessageAt: serverTimestamp(),
        unreadCount: {
          [auth.currentUser.uid]: 0,
          [post.authorUid]: 0
        }
      }, { merge: true });
      
      navigate(`/messages/${chatId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'SocialWave Ripple',
      text: `${post.authorName} on SocialWave: "${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}"`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
      } catch (err) {
        console.error('Error copying to clipboard:', err);
      }
    }
  };

  const handleVote = async (optionId: string) => {
    if (!auth.currentUser || !post.poll || isVoting) return;
    
    // Check if user already voted
    const hasVoted = post.poll.options.some(opt => opt.votes.includes(auth.currentUser!.uid));
    if (hasVoted) return;

    setIsVoting(true);
    const postRef = doc(db, 'posts', post.id);
    
    try {
      const newOptions = post.poll.options.map(opt => {
        if (opt.id === optionId) {
          return { ...opt, votes: [...opt.votes, auth.currentUser!.uid] };
        }
        return opt;
      });

      await updateDoc(postRef, {
        'poll.options': newOptions
      });
    } catch (err) {
      console.error('Error voting:', err);
    } finally {
      setIsVoting(false);
    }
  };

  const renderContent = (content: string, mentionMapOverride?: Record<string, string>) => {
    // Improved regex to include hyphens and underscores
    const parts = content.split(/([#@][\w\u0080-\uffff-]+)/g);
    const mMap = mentionMapOverride || post.mentionMap;
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        const tag = part.substring(1).toLowerCase();
        return <Link key={i} to={`/hashtag/${tag}`} className="text-emerald-600 hover:underline font-medium">{part}</Link>;
      }
      if (part.startsWith('@')) {
        const slug = part.substring(1).toLowerCase();
        const userId = mMap?.[slug];
        if (userId) {
          return <Link key={i} to={`/profile/${userId}`} className="text-emerald-600 hover:underline font-medium">{part}</Link>;
        }
        return <span key={i} className="text-stone-400">{part}</span>;
      }
      return part;
    });
  };

  const handleLike = async () => {
    if (!auth.currentUser || isLiking || likeError?.code === 'resource-exhausted') return;
    
    setIsLiking(true);
    const postRef = doc(db, 'posts', post.id);
    const userLikeRef = doc(db, `posts/${post.id}/likes`, auth.currentUser.uid);
    
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);

      if (isLiked) {
        batch.delete(userLikeRef);
        batch.update(postRef, { likesCount: increment(-1) });
      } else {
        batch.set(userLikeRef, {
          userId: auth.currentUser.uid,
          postId: post.id,
          createdAt: serverTimestamp(),
        });
        batch.update(postRef, { likesCount: increment(1) });
      }
      
      await batch.commit();
      if (!isLiked) {
        triggerNotification(post.authorUid, 'like', post.id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${post.id}/likes`);
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (!auth.currentUser || likeError?.code === 'resource-exhausted') return;
    const bookmarkRef = doc(db, `users/${auth.currentUser.uid}/bookmarks`, post.id);

    try {
      if (isBookmarked) {
        await deleteDoc(bookmarkRef);
      } else {
        await setDoc(bookmarkRef, {
          userId: auth.currentUser.uid,
          postId: post.id,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}/bookmarks/${post.id}`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !auth.currentUser || commentsError?.code === 'resource-exhausted') return;

    const text = commentText;
    setCommentText('');

    try {
      const { writeBatch, getDocs, query, collection } = await import('firebase/firestore');
      
      // Resolve mentions in comment
      const mentionMatches = text.match(/@[\w\u0080-\uffff-]+/g);
      const rawMentions = mentionMatches ? Array.from(new Set(mentionMatches.map(m => m.substring(1)))) : [];
      const mentionMap: Record<string, string> = {};

      if (rawMentions.length > 0) {
        const { where } = await import('firebase/firestore');
        const usersRef = collection(db, 'users');
        const mentionSlugs = (rawMentions as string[]).map(m => m.toLowerCase());
        
        // Firestore 'in' query supports up to 10 items
        const chunks = [];
        for (let i = 0; i < mentionSlugs.length; i += 10) {
          chunks.push(mentionSlugs.slice(i, i + 10));
        }

        for (const chunk of chunks) {
          const querySnapshot = await getDocs(query(usersRef, where('displayNameSlug', 'in', chunk)));
          querySnapshot.docs.forEach(doc => {
            const userData = doc.data();
            const slug = userData.displayNameSlug || userData.displayName?.toLowerCase().replace(/\s+/g, '');
            if (slug) {
              mentionMap[slug] = doc.id;
            }
          });
        }
      }

      const batch = writeBatch(db);
      
      const commentRef = doc(collection(db, `posts/${post.id}/comments`));
      const postRef = doc(db, 'posts', post.id);

      batch.set(commentRef, {
        postId: post.id,
        authorUid: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'Anonymous',
        authorPhoto: auth.currentUser.photoURL || '',
        content: text,
        createdAt: serverTimestamp(),
        mentionMap,
      });

      batch.update(postRef, { commentsCount: increment(1) });
      
      await batch.commit();
      
      // Trigger notifications for comment mentions
      for (const slug in mentionMap) {
        triggerNotification(mentionMap[slug], 'mention', post.id);
      }
      
      triggerNotification(post.authorUid, 'comment', post.id);
    } catch (error) {
      setCommentText(text); // Restore text on error
      handleFirestoreError(error, OperationType.CREATE, `posts/${post.id}/comments`);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      setShowDeleteModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${post.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-[2rem] shadow-xl shadow-black/5 dark:shadow-white/5 border border-black/5 dark:border-white/5 mb-8 overflow-hidden card-hover">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/profile/${post.authorUid}`} className="relative group">
            <img
              src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName}`}
              alt={post.authorName}
              className="w-12 h-12 rounded-2xl object-cover border border-black/5 dark:border-white/5 transition-transform group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-stone-900 rounded-full"></div>
          </Link>
          <div>
            <Link to={`/profile/${post.authorUid}`} className="font-bold font-display text-stone-900 dark:text-stone-50 leading-none mb-1 hover:underline block">{post.authorName}</Link>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">@{post.authorName.toLowerCase().replace(/\s+/g, '')}</p>
            <p className="text-[10px] uppercase tracking-widest font-bold text-stone-300 dark:text-stone-600">
              {post.createdAt && typeof post.createdAt.toDate === 'function' 
                ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) 
                : 'Just now'}
            </p>
          </div>
        </div>
        
        {auth.currentUser?.uid === post.authorUid && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors text-stone-400 hover:text-rose-600"
              title="Delete Post"
            >
              <Trash2 size={20} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-2.5 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-xl transition-colors text-stone-400 dark:text-stone-500"
              >
                <MoreHorizontal size={20} />
              </button>
              {showOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border border-black/5 dark:border-white/5 py-2 z-10 overflow-hidden">
                  <button
                    onClick={() => {
                      setShowOptions(false);
                      setShowDeleteModal(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2 font-bold transition-colors"
                  >
                    <Trash2 size={16} />
                    Delete Post
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-4">
        <p className="text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed text-lg">
          {renderContent(post.content)}
        </p>
      </div>

      {post.poll && (
        <div className="px-6 pb-4">
          <div className="bg-stone-50 dark:bg-stone-800/50 rounded-3xl p-6 border border-black/5 dark:border-white/5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 size={18} className="text-emerald-500" />
              <h4 className="font-bold text-sm text-stone-900 dark:text-stone-50">{post.poll.question}</h4>
            </div>
            
            <div className="space-y-3">
              {(() => {
                const totalVotes = post.poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);
                const hasVoted = auth.currentUser ? post.poll.options.some(opt => opt.votes.includes(auth.currentUser!.uid)) : false;
                const isExpired = post.poll.expiresAt.toDate() < new Date();

                return post.poll.options.map((opt) => {
                  const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                  const isUserVote = auth.currentUser ? opt.votes.includes(auth.currentUser.uid) : false;

                  return (
                    <button
                      key={opt.id}
                      disabled={!auth.currentUser || hasVoted || isExpired || isVoting}
                      onClick={() => handleVote(opt.id)}
                      className="w-full relative group overflow-hidden rounded-2xl border border-black/5 dark:border-white/5 transition-all disabled:cursor-default"
                    >
                      {/* Progress Bar */}
                      {(hasVoted || isExpired) && (
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={`absolute inset-0 ${isUserVote ? 'bg-emerald-500/20' : 'bg-stone-200/30 dark:bg-stone-700/30'}`}
                        />
                      )}
                      
                      <div className="relative px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isUserVote ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-stone-700 dark:text-stone-300'}`}>
                            {opt.text}
                          </span>
                          {isUserVote && <Check size={14} className="text-emerald-500" />}
                        </div>
                        {(hasVoted || isExpired) && (
                          <span className="text-xs font-bold text-stone-400">{percentage}%</span>
                        )}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
                {post.poll.options.reduce((acc, opt) => acc + opt.votes.length, 0)} votes
              </p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
                {post.poll.expiresAt.toDate() < new Date() ? 'Poll ended' : '24h left'}
              </p>
            </div>
          </div>
        </div>
      )}

      {displayQuotedPost && (
        <div className="px-6 pb-4">
          <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-black/5 dark:border-white/5 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer">
            <Link to={`/profile/${displayQuotedPost.authorUid}`} className="flex items-center gap-2 mb-2 group">
              <img src={displayQuotedPost.authorPhoto} alt="" className="w-5 h-5 rounded-full" />
              <span className="text-xs font-bold text-stone-900 dark:text-stone-50 group-hover:underline">{displayQuotedPost.authorName}</span>
              <span className="text-[10px] text-stone-400 font-medium">
                {displayQuotedPost.createdAt && typeof (displayQuotedPost.createdAt as any).toDate === 'function' 
                  ? formatDistanceToNow((displayQuotedPost.createdAt as any).toDate(), { addSuffix: true }) 
                  : ''}
              </span>
            </Link>
            <p className="text-sm text-stone-600 dark:text-stone-400 line-clamp-3">{displayQuotedPost.content}</p>
            {displayQuotedPost.imageUrl && (
              <img src={displayQuotedPost.imageUrl} alt="" className="mt-3 max-h-48 rounded-xl object-cover w-full border border-black/5" />
            )}
          </div>
        </div>
      )}

      {post.imageUrl && (
        <div className="px-6 pb-6">
          <img
            src={post.imageUrl}
            alt="Post attachment"
            className="w-full rounded-[1.5rem] object-cover max-h-[600px] border border-black/5 dark:border-white/5 shadow-inner"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      <div className="px-6 py-4 border-t border-black/5 dark:border-white/5 flex items-center gap-8">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2.5 transition-all ${
            isLiked ? 'text-rose-600 scale-110' : 'text-stone-400 hover:text-rose-600'
          }`}
        >
          <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} />
          <span className="text-xs font-bold tracking-widest">{post.likesCount || 0}</span>
        </button>
        <button 
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-2.5 transition-all ${
            showComments ? 'text-stone-900 dark:text-stone-50' : 'text-stone-400 hover:text-stone-900 dark:hover:text-stone-50'
          }`}
        >
          <MessageCircle size={22} />
          <span className="text-xs font-bold tracking-widest">{post.commentsCount || 0}</span>
        </button>
        <button 
          onClick={handleBookmark}
          className={`flex items-center gap-2.5 transition-all ${
            isBookmarked ? 'text-emerald-600' : 'text-stone-400 hover:text-emerald-600'
          }`}
          title={isBookmarked ? "Remove Bookmark" : "Bookmark Wave"}
        >
          <Bookmark size={22} fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>
        <button 
          onClick={() => setShowQuoteModal(true)}
          className="flex items-center gap-2.5 text-stone-400 hover:text-sky-500 transition-all"
          title="Quote Wave"
        >
          <Quote size={22} />
        </button>
        {auth.currentUser?.uid !== post.authorUid && (
          <>
            <button 
              onClick={handleMessage}
              className="flex items-center gap-2.5 text-stone-400 hover:text-emerald-500 transition-all"
              title="Message Author"
            >
              <Send size={22} className="rotate-[-45deg] translate-y-[-1px]" />
            </button>
          </>
        )}
        <div className="relative ml-auto">
          <button 
            onClick={handleShare}
            className="flex items-center gap-2.5 text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 transition-all"
            title="Share Wave"
          >
            <Share2 size={22} />
          </button>
          <AnimatePresence>
            {showShareTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 text-[10px] font-bold uppercase tracking-widest rounded-lg whitespace-nowrap shadow-xl z-10"
              >
                Link Copied!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-stone-50 dark:bg-stone-950/50 border-t border-black/5 dark:border-white/5 overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-3">
                <img
                  src={auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser?.displayName}`}
                  className="w-8 h-8 rounded-lg object-cover border border-black/5 dark:border-white/5"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full bg-white dark:bg-stone-900 border border-black/5 dark:border-white/5 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all pr-12 text-stone-900 dark:text-stone-50"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 disabled:opacity-30"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <Link to={`/profile/${comment.authorUid}`}>
                      <img
                        src={comment.authorPhoto || `https://ui-avatars.com/api/?name=${comment.authorName}`}
                        className="w-8 h-8 rounded-lg object-cover border border-black/5 dark:border-white/5 hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    </Link>
                    <div className="flex-1 bg-white dark:bg-stone-900 p-3 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <Link to={`/profile/${comment.authorUid}`} className="text-xs font-bold text-stone-900 dark:text-stone-50 hover:underline">{comment.authorName}</Link>
                        <span className="text-[9px] font-bold text-stone-300 dark:text-stone-600 uppercase">
                          {comment.createdAt && typeof comment.createdAt.toDate === 'function' 
                            ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) 
                            : 'now'}
                        </span>
                      </div>
                      <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">{renderContent(comment.content, comment.mentionMap)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Post Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Delete Wave"
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
              onClick={handleDelete}
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
        <p>Are you sure you want to delete this wave? This action cannot be undone.</p>
      </Modal>

      {/* Quote Modal */}
      <Modal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        title="Quote Wave"
      >
        <div className="pt-2">
          <CreatePost 
            quotedPost={post} 
            onSuccess={() => setShowQuoteModal(false)} 
            onCancel={() => setShowQuoteModal(false)}
          />
        </div>
      </Modal>
    </div>
  );
};
