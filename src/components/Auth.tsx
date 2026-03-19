import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LogIn, LogOut } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useTheme } from './ThemeProvider';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

export const Auth: React.FC = () => {
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (user) {
      api.getUser(user.uid).then(setUserData).catch(console.error);
    } else {
      setUserData(null);
    }
  }, [user]);

  const handleLogout = () => signOut(auth);

  if (loading) return <div className="animate-pulse bg-stone-100 dark:bg-stone-800 h-10 w-24 rounded-full" />;

  if (user) {
    const displayPhoto = userData?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${userData?.displayName || user.displayName}`;
    const name = userData?.displayName || user.displayName || 'User';

    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 dark:bg-stone-800 rounded-full border border-black/5 dark:border-white/5">
          <img
            src={displayPhoto}
            alt={name}
            className="w-6 h-6 rounded-full border border-black/5 dark:border-white/5 object-cover"
            referrerPolicy="no-referrer"
          />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300 hidden sm:inline">
            {name}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-full transition-all"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    );
  }

  return (
    <Link
      to="/login"
      className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20"
    >
      <LogIn size={18} />
      <span>Sign In</span>
    </Link>
  );
};

