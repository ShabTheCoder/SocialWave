import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Story } from '../types';
import { auth } from '../firebase';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const StoriesBar: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const fetched = await api.getStories();
      setStories(fetched);
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (file.size > 1000000) {
      alert('Image too large. Max 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await api.createStory({
          authorId: auth.currentUser!.uid,
          authorName: auth.currentUser!.displayName || 'Anonymous',
          authorPhoto: auth.currentUser!.photoURL || '',
          imageUrl: reader.result as string,
        });
        fetchStories();
      } catch (error) {
        console.error('Failed to create story:', error);
      }
    };
    reader.readAsDataURL(file);
  };

  // Group stories by author
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.authorId]) {
      acc[story.authorId] = [];
    }
    acc[story.authorId].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const uniqueAuthors = Object.values(groupedStories).map(authorStories => authorStories[0]);

  return (
    <div className="relative">
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-4">
        {/* Add Story */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-full border-2 border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center hover:border-stone-900 dark:hover:border-stone-50 transition-colors"
          >
            <Plus size={24} className="text-stone-400" />
          </button>
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">You</span>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleCreateStory} 
            className="hidden" 
            accept="image/*" 
          />
        </div>

        {/* Story List */}
        {uniqueAuthors.map((story) => (
          <button
            key={story.id}
            onClick={() => setSelectedStory(story)}
            className="flex-shrink-0 flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 rounded-full p-0.5 border-2 border-emerald-500 group-hover:scale-105 transition-transform">
              <img 
                src={story.authorPhoto || `https://ui-avatars.com/api/?name=${story.authorName}`} 
                alt={story.authorName}
                className="w-full h-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider truncate w-16 text-center">
              {story.authorName.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Story Viewer */}
      <AnimatePresence>
        {selectedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
          >
            <button 
              onClick={() => setSelectedStory(null)}
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>

            <div className="relative max-w-lg w-full aspect-[9/16] bg-stone-900 rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src={selectedStory.imageUrl || undefined} 
                alt="Story" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              
              <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent flex items-center gap-3">
                <img 
                  src={selectedStory.authorPhoto || `https://ui-avatars.com/api/?name=${selectedStory.authorName}`} 
                  alt={selectedStory.authorName}
                  className="w-10 h-10 rounded-full border-2 border-white/20"
                  referrerPolicy="no-referrer"
                />
                <span className="text-white font-bold">{selectedStory.authorName}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
