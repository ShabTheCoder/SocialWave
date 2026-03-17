import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, orderBy, limit, addDoc, serverTimestamp, doc, updateDoc, onSnapshot, deleteDoc, getDocs, writeBatch, where } from 'firebase/firestore';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
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

  const [chatDoc] = useDocument(doc(db, 'chats', chatId!));
  const chatData = chatDoc?.data();

  const scrollRef = useRef<HTMLDivElement>(null);

  const [messagesSnapshot] = useCollection(
    query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc'),
      limit(100)
    )
  );

  const messages = messagesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
  const isGroup = chatData?.isGroup;
  const otherParticipantId = !isGroup ? chatData?.participants.find((p: string) => p !== auth.currentUser?.uid) : null;
  const [otherUserDoc] = useDocument(otherParticipantId ? doc(db, 'users', otherParticipantId) : null);
  const otherUser = otherUserDoc?.data();

  const [participantsSnapshot] = useCollection(
    chatData?.participants ? query(collection(db, 'users'), where('uid', 'in', chatData.participants)) : null
  );
  const participants = participantsSnapshot?.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as any[] || [];
  const participantsMap = Object.fromEntries(participants.map(p => [p.uid, p]));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read when entering
  useEffect(() => {
    if (chatId && auth.currentUser && chatData?.unreadCount?.[auth.currentUser.uid] > 0) {
      const updateUnread = async () => {
        await updateDoc(doc(db, 'chats', chatId), {
          [`unreadCount.${auth.currentUser!.uid}`]: 0
        });
      };
      updateUnread();
    }
  }, [chatId, chatData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser || !chatId) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const messageRef = collection(db, `chats/${chatId}/messages`);
        const chatRef = doc(db, 'chats', chatId);

        await addDoc(messageRef, {
          chatId,
          senderId: auth.currentUser!.uid,
          content: 'Sent a photo',
          imageUrl: base64,
          createdAt: serverTimestamp(),
        });

        await updateDoc(chatRef, {
          lastMessage: 'Sent a photo',
          lastMessageAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Failed to upload image:', error);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearChat = async () => {
    if (!chatId || !window.confirm('Are you sure you want to clear all messages in this chat?')) return;
    try {
      const messagesRef = collection(db, `chats/${chatId}/messages`);
      const snapshot = await getDocs(messagesRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: 'Chat cleared',
        lastMessageAt: serverTimestamp()
      });
      setShowMore(false);
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  };

  const handleDeleteChat = async () => {
    if (!chatId || !window.confirm('Are you sure you want to delete this entire chat?')) return;
    try {
      await handleClearChat();
      await deleteDoc(doc(db, 'chats', chatId));
      navigate('/messages');
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !auth.currentUser) return;

    const text = message;
    setMessage('');
    setShowEmojiPicker(false);

    try {
      const messageRef = collection(db, `chats/${chatId}/messages`);
      const chatRef = doc(db, 'chats', chatId!);

      await addDoc(messageRef, {
        chatId,
        senderId: auth.currentUser.uid,
        content: text,
        createdAt: serverTimestamp(),
      });

      const unreadUpdate: any = {};
      chatData?.participants.forEach((p: string) => {
        if (p !== auth.currentUser?.uid) {
          unreadUpdate[`unreadCount.${p}`] = (chatData?.unreadCount?.[p] || 0) + 1;
        }
      });

      await updateDoc(chatRef, {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        ...unreadUpdate
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessage(text);
    }
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
                        {participants.map((p: any) => (
                          <div key={p.uid} className="flex items-center gap-2">
                            <img src={p.photoURL || `https://ui-avatars.com/api/?name=${p.displayName}`} className="w-6 h-6 rounded-lg object-cover" referrerPolicy="no-referrer" />
                            <span className="text-xs font-medium text-stone-700 dark:text-stone-300 truncate">{p.displayName}</span>
                          </div>
                        ))}
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
                  {msg.createdAt?.toDate ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) : 'now'}
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
