import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { api } from '../services/api';
import { X, Search, Users, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoadingUsers(true);
      api.listUsers()
        .then(allUsers => {
          setUsers(allUsers.filter(u => u.id !== auth.currentUser?.uid));
        })
        .catch(console.error)
        .finally(() => setLoadingUsers(false));
    }
  }, [isOpen]);

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 1 || !auth.currentUser) return;

    setIsCreating(true);
    try {
      const participants = [auth.currentUser.uid, ...selectedUsers];

      const chatId = await api.createChat(participants);

      if (chatId) {
        onClose();
        navigate(`/messages/${chatId}`);
      }
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-black/5 dark:border-white/5"
          >
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stone-100 dark:bg-stone-800 rounded-xl">
                  <Users size={20} className="text-stone-900 dark:text-stone-50" />
                </div>
                <h2 className="text-xl font-display font-bold text-stone-900 dark:text-stone-50">New Group</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
                <X size={20} className="text-stone-400" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400 px-1">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  className="w-full bg-stone-50 dark:bg-stone-950 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all outline-none text-stone-900 dark:text-stone-50"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Add Members</label>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {selectedUsers.length} Selected
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search users..."
                    className="w-full bg-stone-50 dark:bg-stone-950 border border-black/5 dark:border-white/5 rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all outline-none text-stone-900 dark:text-stone-50"
                  />
                </div>

                <div className="space-y-2">
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
                    </div>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => toggleUser(user.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border ${
                          selectedUsers.includes(user.id)
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'hover:bg-stone-50 dark:hover:bg-stone-800 border-transparent'
                        }`}
                      >
                        <img
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 text-left">
                          <p className="text-sm font-bold text-stone-900 dark:text-stone-50">{user.displayName}</p>
                          <p className="text-xs text-stone-400">@{user.displayName?.toLowerCase().replace(/\s+/g, '')}</p>
                        </div>
                        {selectedUsers.includes(user.id) && (
                          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                            <Check size={14} />
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <p className="text-center py-8 text-sm text-stone-400">No users found</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-stone-50 dark:bg-stone-950/50 border-t border-black/5 dark:border-white/5">
              <button
                onClick={handleCreateGroup}
                disabled={isCreating || !groupName.trim() || selectedUsers.length < 1}
                className="w-full py-4 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-2xl font-bold shadow-xl shadow-stone-900/10 dark:shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating Group...
                  </>
                ) : (
                  'Create Group'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
