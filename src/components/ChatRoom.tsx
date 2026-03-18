import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { api } from '../services/api';
import { ArrowLeft, Send, MoreHorizontal, Image as ImageIcon, Smile, X, Trash2, Eraser } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from './Modal';

const EMOJIS = ['❤️', '😂', '🔥', '🙌', '✨', '😍', '🤔', '👍', '🙏', '💯', '😎', '😢', '🎉', '🚀', '👀', '💡'];

export const ChatRoom: React.FC = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatData, setChatData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [participantsMap, setParticipantsMap] = useState<any>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const isGroup = chatData?.isGroup;
  const otherParticipantId = chatData?.participants?.find((p: string) => p !== auth.currentUser?.uid);

  useEffect(() => {
    if (chatId && auth.currentUser) {
      const fetchChat = async () => {
        try {
          const chats = await api.getChats(auth.currentUser!.uid);
          const currentChat = chats.find(c => c.id === chatId);
          if (currentChat) {
            setChatData(currentChat);
            const otherId = currentChat.participants.find((p: string) => p !== auth.currentUser?.uid);
            if (otherId) {
              const user = await api.getUser(otherId);
              setOtherUser(user);
              setParticipantsMap((prev: any) => ({ ...prev, [otherId]: user }));
            }
            // Add current user to participants map
            const currentUserData = await api.getUser(auth.currentUser!.uid);
            setParticipantsMap((prev: any) => ({ ...prev, [auth.currentUser!.uid]: currentUserData }));
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchChat();
    }
  }, [chatId]);

  useEffect(() => {
    if (chatId) {
      const fetchMessages = () => {
        api.getMessages(chatId)
          .then(setMessages)
          .catch(console.error);
      };
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [chatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !auth.currentUser || !chatId) return;

    const text = message;
    setMessage('');
    setShowEmojiPicker(false);

    try {
      await api.sendMessage(chatId, {
        senderId: auth.currentUser.uid,
        text
      });
      // Refresh messages immediately
      const msgs = await api.getMessages(chatId);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessage(text);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Placeholder for now
  };

  const handleClearChat = async () => {
    // Placeholder for now
  };

  const handleDeleteChat = async () => {
    // Placeholder for now
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-stone-50 dark:bg-stone-950">
      {/* Chat Header */}
      <div className="bg-white dark:bg-stone-900 border-b border-black/5 dark:border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/messages')}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors text-stone-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3 group">
            <img 
              src={isGroup ? (chatData?.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatData?.name)}&background=random`) : (otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName || 'User'}`)} 
              alt="" 
              className="w-10 h-10 rounded-xl object-cover border border-black/5 dark:border-white/5 group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-50 leading-tight">
                {isGroup ? chatData?.name : (otherUser?.displayName || 'Loading...')}
              </h3>
              <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-500">
                {isGroup ? `${chatData?.participants.length} Members` : 'Online'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => setShowMore(!showMore)}
              className="p-2.5 text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-all"
            >
              <MoreHorizontal size={20} />
            </button>
            <AnimatePresence>
              {showMore && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border border-black/5 dark:border-white/5 py-2 z-20 overflow-hidden"
                >
                  <button 
                    onClick={() => {
                      if (!isGroup) {
                        navigate(`/profile/${otherParticipantId}`);
                      }
                      setShowMore(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-2"
                  >
                    {isGroup ? 'Group Settings' : 'View Profile'}
                  </button>
                  {isGroup && (
                    <div className="px-4 py-2 border-t border-black/5 dark:border-white/5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Members</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {chatData?.participants.map((pId: string) => {
                          const p = participantsMap[pId];
                          return (
                            <div key={pId} className="flex items-center gap-2">
                              <img src={p?.photoURL || `https://ui-avatars.com/api/?name=${p?.displayName || 'User'}`} className="w-6 h-6 rounded-lg object-cover" referrerPolicy="no-referrer" />
                              <span className="text-xs font-medium text-stone-700 dark:text-stone-300 truncate">{p?.displayName || 'Loading...'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <button 
                    onClick={handleClearChat}
                    className="w-full px-4 py-3 text-left text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-2"
                  >
                    <Eraser size={16} />
                    Clear Chat
                  </button>
                  <button 
                    onClick={handleDeleteChat}
                    className="w-full px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-bold transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete Chat
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
      >
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <ImageIcon size={32} className="text-stone-300 dark:text-stone-600" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400">This is the beginning of your wave</p>
        </div>

        {messages.map((msg: any, idx) => {
          const isMe = msg.senderId === auth.currentUser?.uid;
          const sender = participantsMap[msg.senderId];
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] space-y-1`}>
                {!isMe && isGroup && (
                  <p className="text-[10px] font-bold text-stone-400 ml-2 mb-1">
                    {sender?.displayName || 'Unknown User'}
                  </p>
                )}
                <div className={`px-5 py-3 rounded-[1.5rem] text-sm shadow-sm ${
                  isMe 
                    ? 'bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-tr-none' 
                    : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border border-black/5 dark:border-white/5 rounded-tl-none'
                }`}>
                  {msg.imageUrl && (
                    <img 
                      src={msg.imageUrl} 
                      alt="" 
                      className="max-w-full rounded-xl mb-2 border border-black/5 dark:border-white/5" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  {msg.content}
                </div>
                <p className={`text-[9px] font-bold uppercase tracking-widest text-stone-400 ${isMe ? 'text-right' : 'text-left'}`}>
                  {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : 'now'}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Message Input */}
      <div className="p-6 bg-white dark:bg-stone-900 border-t border-black/5 dark:border-white/5 relative">
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-full left-6 mb-4 p-4 bg-white dark:bg-stone-800 rounded-3xl shadow-2xl border border-black/5 dark:border-white/5 grid grid-cols-8 gap-2 z-20"
            >
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setMessage(prev => prev + emoji)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors text-xl"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept="image/*"
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2.5 text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 transition-colors disabled:opacity-30"
          >
            <ImageIcon size={22} />
          </button>
          <button 
            type="button" 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 transition-colors ${showEmojiPicker ? 'text-stone-900 dark:text-stone-50' : 'text-stone-400 hover:text-stone-900 dark:hover:text-stone-50'}`}
          >
            <Smile size={22} />
          </button>
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={() => setShowEmojiPicker(false)}
              placeholder="Type a message..." 
              className="w-full bg-stone-50 dark:bg-stone-950 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all outline-none text-stone-900 dark:text-stone-50"
            />
          </div>
          <button 
            type="submit"
            disabled={!message.trim()}
            className="p-3 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-2xl shadow-lg shadow-stone-900/10 dark:shadow-white/5 hover:scale-105 transition-all disabled:opacity-30 disabled:scale-100"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};
