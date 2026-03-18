import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { PostCard } from './PostCard';
import { Post } from '../types';
import { Hash, Compass } from 'lucide-react';

export const HashtagPage: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tag) {
      setLoading(true);
      api.getPostsByHashtag(tag)
        .then(setPosts)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [tag]);

  return (
    <div className="space-y-8">
      <div className="px-4 flex items-center gap-4">
        <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
          <Hash size={24} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-stone-900 dark:text-stone-50">#{tag}</h2>
          <p className="text-stone-400 text-sm">Waves tagged with this ripple</p>
        </div>
      </div>

      <div className="space-y-8">
        {loading ? (
          <div className="animate-pulse space-y-8">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-stone-100 dark:bg-stone-900 rounded-[2rem]" />)}
          </div>
        ) : posts.length > 0 ? (
          posts.map(post => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="text-center py-24 bg-white dark:bg-stone-900 rounded-3xl border border-black/5 dark:border-white/5 border-dashed">
            <div className="max-w-xs mx-auto space-y-4">
              <div className="bg-stone-50 dark:bg-stone-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Compass className="text-stone-300 dark:text-stone-600 w-8 h-8" />
              </div>
              <p className="text-stone-400 dark:text-stone-500 font-medium text-lg">No waves found with this hashtag yet.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
