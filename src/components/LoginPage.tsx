import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { LogIn, Mail, Lock, User as UserIcon, ArrowRight, Waves, ChevronLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useTheme } from './ThemeProvider';
import { motion } from 'motion/react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user is already logged in, send them home
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const syncUserToBackend = async (loggedUser: any, name?: string) => {
    await api.syncUser({
      id: loggedUser.uid,
      displayName: name || loggedUser.displayName || 'User',
      email: loggedUser.email || `${loggedUser.uid}@socialwave.app`,
      photoURL: loggedUser.photoURL || `https://ui-avatars.com/api/?name=${name || loggedUser.displayName || 'User'}&background=random`,
      theme: theme || 'light',
      bio: '',
    });
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      await syncUserToBackend(result.user);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('The login popup was blocked. Please click "Open App in New Tab" below and try again there.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain "${window.location.hostname}" is not authorized. Use the button below to copy it and add it to Firebase.`);
      } else {
        setError(`[${err.code}] ${err.message}`);
      }
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        await syncUserToBackend(result.user, displayName);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await syncUserToBackend(result.user);
      }
      navigate('/');
    } catch (err: any) {
      setError(`[${err.code}] ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="bg-stone-900 dark:bg-stone-50 p-2 rounded-xl transition-transform group-hover:scale-110">
              <Waves className="text-white dark:text-stone-900" size={24} />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-stone-900 dark:text-stone-50">SocialWave</h1>
          </Link>
          <h2 className="text-3xl font-display font-bold text-stone-900 dark:text-stone-50">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-stone-500 mt-2">
            {isRegistering ? 'Join the ocean of ripples' : 'Dive back into the wave'}
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] p-8 shadow-2xl border border-black/5 dark:border-white/5">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isRegistering && (
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-stone-50 dark:bg-stone-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-stone-50 dark:bg-stone-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-stone-50 dark:bg-stone-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {error && (
              <div className="px-2 space-y-3">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30">
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                    {error}
                  </p>
                </div>
                
                {(error.includes('unauthorized-domain') || error.includes('not authorized')) && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Troubleshooting Steps:</p>
                    <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-black/5 dark:border-white/5 space-y-2">
                      <p className="text-[11px] text-stone-600 dark:text-stone-400">
                        1. Open Firebase Console for Project: <br/>
                        <span className="font-mono font-bold text-stone-900 dark:text-stone-100">gen-lang-client-0530453740</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.hostname);
                          alert('Domain copied! Paste it in Firebase Settings -> Authorized domains');
                        }}
                        className="w-full py-2 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 text-[10px] rounded-lg font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
                      >
                        Copy Domain: {window.location.hostname}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-2xl font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegistering ? 'Sign Up' : 'Sign In'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100 dark:border-stone-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
              <span className="bg-white dark:bg-stone-900 px-4 text-stone-300 dark:text-stone-600">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 text-stone-900 dark:text-stone-50 rounded-2xl font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-all flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
            <span>Google</span>
          </button>

          <p className="mt-8 text-center text-sm text-stone-500">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-emerald-600 font-bold hover:underline"
            >
              {isRegistering ? 'Sign In' : 'Create One'}
            </button>
          </p>
        </div>

        <div className="mt-8 space-y-4 text-center">
          <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
            <p className="text-[10px] text-stone-400 text-center mb-3 uppercase tracking-widest font-bold">Authentication issues?</p>
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-xl text-xs font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-all flex items-center justify-center gap-2"
            >
              <ArrowRight size={14} className="-rotate-45" />
              Open App in New Tab
            </a>
          </div>
          
          <Link to="/" className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 transition-colors text-sm font-medium">
            <ChevronLeft size={16} />
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
