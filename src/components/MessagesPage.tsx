import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { api } from '../services/api';
import { MessageSquare, Search, Plus, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CreateGroupModal } from './CreateGroupModal';

export const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.currentUser) {
      setLoading(true);
      api.getChats(auth.currentUser.uid)
        .then(setChats)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900 dark:border-stone-50"></div>
        <p className="text-stone-400 font-medium animate-pulse">Opening your messages...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-display font-bold text-stone-900 dark:text-stone-50">Messages</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsCreateGroupOpen(true)}
            className="p-3 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 hover:scale-105 transition-all flex items-center gap-2 font-bold text-sm"
          >
            <Users size={18} />
            <span className="hidden sm:inline">New Group</span>
          </button>
          <button 
            onClick={() => navigate('/discover')}
            className="p-3 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-2xl shadow-lg shadow-stone-900/10 dark:shadow-white/5 hover:scale-105 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <CreateGroupModal isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} />

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
        <input 
          type="text" 
          placeholder="Search conversations..." 
          className="w-full bg-white dark:bg-stone-900 border border-black/5 dark:border-white/5 rounded-2xl py-4 pl-12 pr-4 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all outline-none"
        />
      </div>

      <div className="space-y-3">
        {chats.length > 0 ? (
          chats.map((chat: any) => {
            const isGroup = chat.isGroup;
            const otherParticipantId = chat.participants.find((p: string) => p !== auth.currentUser?.uid);
            
            return (
              <Link 
                key={chat.id} 
                to={`/messages/${chat.id}`}
                className="block p-5 bg-white dark:bg-stone-900 rounded-[2rem] border border-black/5 dark:border-white/5 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center overflow-hidden">
                      <img 
                        src={isGroup ? (chat.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random`) : `https://ui-avatars.com/api/?name=User&background=random`} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    {chat.unreadCount?.[auth.currentUser!.uid] > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-stone-900">
                        {chat.unreadCount[auth.currentUser!.uid]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-stone-900 dark:text-stone-50 truncate group-hover:text-emerald-600 transition-colors">
                        {isGroup ? chat.name : `Chat with ${otherParticipantId?.substring(0, 6)}...`}
                      </h3>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                        {chat.lastMessageAt ? formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true }) : 'now'}
                      </span>
                    </div>
                    <p className="text-sm text-stone-500 dark:text-stone-400 truncate leading-relaxed">
                      {chat.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-32 bg-stone-50 dark:bg-stone-950/30 rounded-[3rem] border border-dashed border-stone-200 dark:border-stone-800">
            <MessageSquare size={48} className="text-stone-200 dark:text-stone-800 mx-auto mb-6" />
            <h3 className="text-xl font-display font-bold text-stone-400">No conversations yet</h3>
            <p className="text-stone-400 text-sm mt-2">Start a new conversation or create a group.</p>
          </div>
        )}
      </div>
    </div>
  );
};
