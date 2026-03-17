import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { RefreshCcw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const [canPull, setCanPull] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  
  const opacity = useTransform(y, [0, 80], [0, 1]);
  const rotate = useTransform(y, [0, 100], [0, 360]);

  useEffect(() => {
    const handleScroll = () => {
      setCanPull(window.scrollY <= 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePan = (_: any, info: any) => {
    if (isRefreshing) return;

    // Only start pulling if we are at the top and moving down
    if (canPull && info.offset.y > 0 && !isDragging && info.delta.y > 0) {
      setIsDragging(true);
    }

    if (isDragging) {
      // Apply some resistance
      const newY = Math.max(0, info.offset.y * 0.4);
      y.set(newY);
    }
  };

  const handlePanEnd = async (_: any, info: any) => {
    if (!isDragging || isRefreshing) return;
    setIsDragging(false);

    if (y.get() > 60) {
      setIsRefreshing(true);
      // Animate to refreshing position
      await animate(y, 60, { type: "spring", stiffness: 300, damping: 30 });
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
      }
    } else {
      animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
    }
  };

  return (
    <div className="relative">
      <motion.div
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          height: 60, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          opacity,
          y: useTransform(y, (val) => val - 60)
        }}
        animate={isRefreshing ? { opacity: 1, y: 0 } : {}}
      >
        <motion.div
          style={{ rotate: isRefreshing ? undefined : rotate }}
          animate={isRefreshing ? { rotate: 360 } : {}}
          transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
          className="bg-white dark:bg-stone-900 p-2 rounded-full shadow-lg border border-black/5 dark:border-white/5 text-emerald-500"
        >
          <RefreshCcw size={20} />
        </motion.div>
      </motion.div>

      <motion.div
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        style={{ y }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
};
