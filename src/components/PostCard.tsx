import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { api } from '../services/api';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Send, Bookmark, Quote, BarChart2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post, Poll } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';

import { Modal } from './Modal';
import { CreatePost } from './CreatePost';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments] = useState<any[]>([]);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [localPoll, setLocalPoll] = useState(post.poll);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    // Initial check for like status (simplified for now)
    // In a real app, we'd fetch this from the backend
  }, [post.id]);

  const handleMessage = async () => {
    if (!auth.currentUser || !post.authorId || auth.currentUser.uid === post.authorId) return;
    // Simplified chat logic for now
    navigate(`/messages/${post.authorId}`);
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

  const renderContent = (content: string) => {
    const parts = content.split(/([#@][\w\u0080-\uffff-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        const tag = part.substring(1).toLowerCase();
        return <Link key={i} to={`/hashtag/${tag}`} className="text-emerald-600 hover:underline font-medium">{part}</Link>;
      }
      if (part.startsWith('@')) {
        return <span key={i} className="text-emerald-600 font-medium">{part}</span>;
      }
      return part;
    });
  };

  const handleLike = async () => {
    if (!auth.currentUser || isLiking) return;
    
    setIsLiking(true);
    try {
      if (isLiked) {
        await api.unlikePost(post.id, auth.currentUser.uid);
        setLikesCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        await api.likePost(post.id, auth.currentUser.uid);
        setLikesCount(prev => prev + 1);
        setIsLiked(true);
        if (post.authorId !== auth.currentUser.uid) {
          api.createNotification(post.authorId, {
            type: 'like',
            postId: post.id,
            fromUid: auth.currentUser.uid,
            fromName: auth.currentUser.displayName || 'Someone'
          });
        }
      }
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !auth.currentUser) return;
    setCommentText('');
    // Simplified comment logic for now
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deletePost(post.id);
      setShowDeleteModal(false);
      window.location.reload();
    } catch (error) {
      console.error('Error deleting post:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!auth.currentUser || !localPoll) return;
    try {
      const { poll } = await api.votePoll(post.id, auth.currentUser.uid, optionId);
      setLocalPoll(poll);
    } catch (error) {
      console.error('Error voting on poll:', error);
    }
  };

  const formattedDate = () => {
    try {
      if (!post.createdAt) return 'Just now';
      const date = new Date(post.createdAt);
      if (isNaN(date.getTime())) return 'Just now';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Just now';
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-[2rem] shadow-xl shadow-black/5 dark:shadow-white/5 border border-black/5 dark:border-white/5 mb-8 overflow-hidden card-hover">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/profile/${post.authorId}`} className="relative group">
            <img
              src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName}`}
              className="w-12 h-12 rounded-2xl object-cover border border-black/5 dark:border-white/5 transition-transform group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-stone-900 rounded-full"></div>
          </Link>
          <div>
            <Link to={`/profile/${post.authorId}`} className="font-bold font-display text-stone-900 dark:text-stone-50 leading-none mb-1 hover:underline block">{post.authorName}</Link>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">@{post.authorName.toLowerCase().replace(/\s+/g, '')}</p>
            <p className="text-[10px] uppercase tracking-widest font-bold text-stone-300 dark:text-stone-600">
              {formattedDate()}
            </p>
          </div>
        </div>
        
        {auth.currentUser?.uid === post.authorId && (
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

      {localPoll && (
        <div className="px-6 pb-6 space-y-3">
          <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-black/5 dark:border-white/5">
            <h4 className="font-bold text-stone-900 dark:text-stone-50 mb-4">{localPoll.question}</h4>
            <div className="space-y-3">
              {localPoll.options.map((option) => {
                const totalVotes = localPoll.options.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0);
                const percentage = totalVotes > 0 ? Math.round(((option.votes?.length || 0) / totalVotes) * 100) : 0;
                const hasVoted = option.votes?.includes(auth.currentUser?.uid || '');
                const userHasVoted = localPoll.options.some(opt => opt.votes?.includes(auth.currentUser?.uid || ''));

                return (
                  <button
                    key={option.id}
                    onClick={() => handleVote(option.id)}
                    disabled={!auth.currentUser}
                    className="relative w-full text-left group overflow-hidden rounded-xl border border-black/5 dark:border-white/5 transition-all hover:border-emerald-500/50"
                  >
                    <div 
                      className="absolute inset-0 bg-emerald-500/10 transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${hasVoted ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-700 dark:text-stone-300'}`}>
                          {option.text}
                        </span>
                        {hasVoted && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      </div>
                      {userHasVoted && (
                        <span className="text-xs font-bold text-stone-400">{percentage}%</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center justify-between">
              <span>{localPoll.options.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0)} votes</span>
              <span>Expires in 24h</span>
            </div>
          </div>
        </div>
      )}

      {/* Quoted Post Placeholder */}
      {post.quotedPost && (
        <div className="px-6 pb-4">
          <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-black/5 dark:border-white/5 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer">
            <Link to={`/profile/${post.quotedPost.authorId}`} className="flex items-center gap-2 mb-2 group">
              <img src={post.quotedPost.authorPhoto} alt="" className="w-5 h-5 rounded-full" />
              <span className="text-xs font-bold text-stone-900 dark:text-stone-50 group-hover:underline">{post.quotedPost.authorName}</span>
            </Link>
            <p className="text-sm text-stone-600 dark:text-stone-400 line-clamp-3">{post.quotedPost.content}</p>
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
          <span className="text-xs font-bold tracking-widest">{likesCount}</span>
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
        {auth.currentUser?.uid !== post.authorId && (
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
                    <Link to={`/profile/${comment.authorId}`}>
                      <img
                        src={comment.authorPhoto || `https://ui-avatars.com/api/?name=${comment.authorName}`}
                        className="w-8 h-8 rounded-lg object-cover border border-black/5 dark:border-white/5 hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    </Link>
                    <div className="flex-1 bg-white dark:bg-stone-900 p-3 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <Link to={`/profile/${comment.authorId}`} className="text-xs font-bold text-stone-900 dark:text-stone-50 hover:underline">{comment.authorName}</Link>
                        <span className="text-[9px] font-bold text-stone-300 dark:text-stone-600 uppercase">
                          {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'now'}
                        </span>
                      </div>
                      <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">{renderContent(comment.content)}</p>
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
