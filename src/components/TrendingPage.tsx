import React from 'react';
import { TrendingHashtags } from './TrendingHashtags';
import { TrendingUp } from 'lucide-react';

export const TrendingPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="px-4 flex items-center gap-4">
        <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
          <TrendingUp size={24} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-stone-900 dark:text-stone-50">Trending</h2>
          <p className="text-stone-400 text-sm">What's making waves right now</p>
        </div>
      </div>

      <div className="lg:hidden">
        <TrendingHashtags />
      </div>
      
      <div className="hidden lg:block text-center py-24 bg-white dark:bg-stone-900 rounded-3xl border border-black/5 dark:border-white/5 border-dashed">
        <p className="text-stone-400 font-medium">Trending is already visible in your sidebar!</p>
      </div>
    </div>
  );
};
