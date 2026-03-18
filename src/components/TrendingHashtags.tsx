import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { Hash, TrendingUp } from 'lucide-react';
import { Post } from '../types';

export const TrendingHashtags: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPosts()
      .then(data => setPosts(data.posts))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hashtagsMap: { [key: string]: number } = {};
  posts.forEach(post => {
    if (post.hashtags && Array.isArray(post.hashtags)) {
      post.hashtags.forEach((tag: string) => {
        hashtagsMap[tag] = (hashtagsMap[tag] || 0) + 1;
      });
    }
  });

  const trendingTags = Object.entries(hashtagsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-black/5 dark:border-white/5 shadow-sm animate-pulse">
        <div className="h-6 w-32 bg-stone-100 dark:bg-stone-800 rounded mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-stone-50 dark:bg-stone-800 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  if (trendingTags.length === 0) return null;

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp size={20} className="text-emerald-500" />
        <h3 className="font-display font-bold text-xl text-stone-900 dark:text-stone-50">Making Waves</h3>
      </div>
      
      <div className="space-y-1">
        {trendingTags.map(([tag, count]) => (
          <Link 
            key={tag} 
            to={`/hashtag/${tag}`}
            className="flex items-center justify-between p-3 rounded-2xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 dark:bg-stone-800 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <Hash size={14} />
              </div>
              <span className="text-sm font-bold text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-stone-50">#{tag}</span>
            </div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{count} waves</span>
          </Link>
        ))}
      </div>
    </div>
  );
};
