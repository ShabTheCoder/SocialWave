import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { api } from '../services/api';
import { Image, X, Send, BarChart2, Plus, Minus, AlertCircle } from 'lucide-react';
import { UserProfile, Post, Poll } from '../types';

interface CreatePostProps {
  quotedPost?: Post;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CreatePost: React.FC<CreatePostProps> = ({ quotedPost, onSuccess, onCancel }) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (auth.currentUser) {
      api.getUser(auth.currentUser.uid).then(setUserProfile).catch(console.error);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1000000) { // 1MB limit for base64
        setError('Image is too large. Please choose an image under 1MB.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.onerror = () => {
        setError('Failed to read image file.');
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isPollValid = showPoll && pollQuestion.trim() && pollOptions.every(opt => opt.trim());
    if (!content.trim() && !image && !isPollValid) return;
    if (!auth.currentUser) return;

    setLoading(true);
    setError(null);
    try {
      await api.createPost({
        authorId: auth.currentUser.uid,
        authorName: userProfile?.displayName || auth.currentUser.displayName || 'Anonymous',
        authorPhoto: userProfile?.photoURL || auth.currentUser.photoURL || '',
        content,
        imageUrl: image || '',
      });

      setContent('');
      setImage(null);
      setError(null);
      setShowPoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      if (onSuccess) onSuccess();
      window.location.reload(); // Refresh to show new post
    } catch (err: any) {
      console.error('Post creation error:', err.message);
      setError('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-[2rem] shadow-xl shadow-black/5 dark:shadow-white/5 border border-black/5 dark:border-white/5 p-6 mb-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <img
            src={userProfile?.photoURL || auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${userProfile?.displayName || auth.currentUser?.displayName}`}
            alt="User"
            className="w-12 h-12 rounded-2xl object-cover border border-black/5 dark:border-white/5"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening?"
              className="w-full py-3 bg-transparent border-none focus:ring-0 resize-none min-h-[120px] text-lg font-medium text-stone-800 dark:text-stone-200 placeholder-stone-300 dark:placeholder-stone-600"
            />
            
            {content.includes('@') && (
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full w-fit">
                <AlertCircle size={12} />
                <span>Tip: Use @lowercase (no spaces) to mention users</span>
              </div>
            )}
          </div>
        </div>
        
        {error && (
          <div className="ml-16 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-full transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        {image && (
          <div className="relative ml-16 inline-block group">
            <img src={image} alt="Preview" className="max-h-80 rounded-2xl object-cover border border-black/5 dark:border-white/5 shadow-lg" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-3 -right-3 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-full p-2 shadow-xl hover:bg-stone-800 dark:hover:bg-stone-200 transition-all flex items-center justify-center"
              title="Remove image"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {showPoll && (
          <div className="ml-16 p-6 bg-stone-50 dark:bg-stone-800/50 rounded-3xl border border-black/5 dark:border-white/5 space-y-4 relative">
            <button 
              type="button"
              onClick={() => setShowPoll(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-full transition-colors"
            >
              <X size={16} className="text-stone-400" />
            </button>
            
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 ml-2">Poll Question</label>
              <input 
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="w-full px-4 py-2.5 bg-white dark:bg-stone-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 ml-2">Options</label>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input 
                    type="text"
                    value={opt}
                    onChange={(e) => updatePollOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 px-4 py-2 bg-white dark:bg-stone-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  {pollOptions.length > 2 && (
                    <button 
                      type="button"
                      onClick={() => removePollOption(i)}
                      className="p-2 text-stone-400 hover:text-rose-500 transition-colors"
                    >
                      <Minus size={18} />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button 
                  type="button"
                  onClick={addPollOption}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <Plus size={14} />
                  <span>Add Option</span>
                </button>
              )}
            </div>
          </div>
        )}

        {quotedPost && (
          <div className="ml-16 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-black/5 dark:border-white/5 relative group">
            <div className="flex items-center gap-2 mb-2">
              <img src={quotedPost.authorPhoto} alt="" className="w-5 h-5 rounded-full" />
              <span className="text-xs font-bold text-stone-900 dark:text-stone-50">{quotedPost.authorName}</span>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-400 line-clamp-2">{quotedPost.content}</p>
            {quotedPost.imageUrl && (
              <img src={quotedPost.imageUrl} alt="" className="mt-2 max-h-32 rounded-lg object-cover w-full" />
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="absolute -top-2 -right-2 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pl-16 pt-4 border-t border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <label className="p-2.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-all text-stone-400 hover:text-stone-900 dark:hover:text-stone-50">
              <Image size={22} />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="hidden" 
                ref={fileInputRef}
              />
            </label>
            <button
              type="button"
              onClick={() => setShowPoll(!showPoll)}
              className={`p-2.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-all ${showPoll ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-stone-400 hover:text-stone-900 dark:hover:text-stone-50'}`}
              title="Add Poll"
            >
              <BarChart2 size={22} />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || (!content.trim() && !image && !(showPoll && pollQuestion.trim() && pollOptions.every(opt => opt.trim())))}
            className="flex items-center gap-2 px-8 py-2.5 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-full font-bold hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-stone-900/10 dark:shadow-white/5"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Post</span>
                <Send size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
