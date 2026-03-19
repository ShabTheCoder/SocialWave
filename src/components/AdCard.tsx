import React from 'react';
import { ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

interface AdCardProps {
  title: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  ctaUrl: string;
  compact?: boolean;
}

export const AdCard: React.FC<AdCardProps> = ({ title, description, imageUrl, ctaText, ctaUrl, compact }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-stone-900 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden group ${compact ? 'p-4' : 'p-6'}`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400">Sponsored</span>
        <ExternalLink size={14} className="text-stone-300 group-hover:text-stone-900 dark:group-hover:text-stone-50 transition-colors" />
      </div>

      <div className={`flex ${compact ? 'flex-row gap-4' : 'flex-col gap-4'}`}>
        <div className={`${compact ? 'w-20 h-20' : 'w-full h-40'} rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0`}>
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="space-y-2 flex-1">
          <h4 className={`font-display font-bold text-stone-900 dark:text-stone-50 leading-tight ${compact ? 'text-sm' : 'text-lg'}`}>
            {title}
          </h4>
          <p className={`text-stone-400 dark:text-stone-500 leading-relaxed ${compact ? 'text-[10px] line-clamp-2' : 'text-xs'}`}>
            {description}
          </p>
          
          {!compact && (
            <a 
              href={ctaUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full py-2.5 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-xl text-xs font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-all shadow-lg shadow-stone-900/10 dark:shadow-white/5"
            >
              {ctaText}
            </a>
          )}
        </div>
      </div>

      {compact && (
        <a 
          href={ctaUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center w-full py-2 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-50 rounded-xl text-[10px] font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
        >
          {ctaText}
        </a>
      )}
    </motion.div>
  );
};
