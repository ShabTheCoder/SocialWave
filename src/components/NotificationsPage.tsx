import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { api } from '../services/api';
import { Heart, MessageCircle, UserPlus, Quote, CheckCircle2, BellOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.currentUser) {
      setLoading(true);
      api.getNotifications(auth.currentUser.uid)
        .then(setNotifications)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, []);

  const markAllAsRead = async () => {
    // Simplified for now
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  useEffect(() => {
    if (notifications.some(n => !n.read)) {
      markAllAsRead();
    }
  }, [notifications]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={18} className="text-rose-500" fill="currentColor" />;
      case 'comment': return <MessageCircle size={18} className="text-emerald-500" />;
      case 'follow': return <UserPlus size={18} className="text-sky-500" />;
      case 'quote': return <Quote size={18} className="text-amber-500" />;
      default: return <CheckCircle2 size={18} className="text-stone-400" />;
    }
  };

  const getMessage = (notif: any) => {
    switch (notif.type) {
      case 'like': return 'liked your wave';
      case 'comment': return 'commented on your wave';
      case 'follow': return 'started following you';
      case 'quote': return 'quoted your wave';
      default: return 'interacted with you';
    }
  };

  const formattedDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Just now';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900 dark:border-stone-50"></div>
        <p className="text-stone-400 font-medium animate-pulse">Checking your waves...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-display font-bold text-stone-900 dark:text-stone-50">Notifications</h1>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllAsRead}
            className="text-xs font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {notifications.length > 0 ? (
            notifications.map((notif: any) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-5 rounded-[2rem] border transition-all flex items-center gap-4 ${
                  notif.read 
                    ? 'bg-white dark:bg-stone-900 border-black/5 dark:border-white/5 opacity-70' 
                    : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 shadow-lg shadow-emerald-500/5'
                }`}
              >
                <div className="relative">
                  <Link to={`/profile/${notif.senderId}`}>
                    <img 
                      src={notif.senderPhoto || `https://ui-avatars.com/api/?name=${notif.senderName}`} 
                      alt="" 
                      className="w-12 h-12 rounded-2xl object-cover border border-black/5 dark:border-white/5"
                    />
                  </Link>
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-stone-800 p-1 rounded-lg shadow-sm">
                    {getIcon(notif.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-stone-800 dark:text-stone-200 text-sm">
                    <Link to={`/profile/${notif.senderId}`} className="font-bold hover:underline">{notif.senderName}</Link>
                    {' '}{getMessage(notif)}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400 mt-1">
                    {formattedDate(notif.createdAt)}
                  </p>
                </div>

                {notif.postId && (
                  <Link 
                    to={`/profile/${auth.currentUser?.uid}`} 
                    className="px-4 py-2 bg-stone-100 dark:bg-stone-800 rounded-xl text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                  >
                    View
                  </Link>
                )}
              </motion.div>
            ))
          ) : (
            <div className="text-center py-32 bg-stone-50 dark:bg-stone-950/30 rounded-[3rem] border border-dashed border-stone-200 dark:border-stone-800">
              <BellOff size={48} className="text-stone-200 dark:text-stone-800 mx-auto mb-6" />
              <h3 className="text-xl font-display font-bold text-stone-400">Silence in the ocean</h3>
              <p className="text-stone-400 text-sm mt-2">When people interact with your waves, you'll see it here.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
