import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, getRedirectResult } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { LogIn, LogOut, Mail, Lock, User as UserIcon, ArrowRight, Github } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocument } from 'react-firebase-hooks/firestore';
import { useTheme } from './ThemeProvider';

export const Auth: React.FC = () => {
  const [user, loading] = useAuthState(auth);
  const [userDoc] = useDocument(user ? doc(db, 'users', user.uid) : null);
  const userData = userDoc?.data();
  const { theme } = useTheme();

  const [isRegistering, setIsRegistering] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const createUserDoc = async (loggedUser: any, name?: string) => {
    const userRef = doc(db, 'users', loggedUser.uid);
    const userSnap = await getDoc(userRef);
    
    const baseData = {
      uid: loggedUser.uid,
      displayName: name || loggedUser.displayName || userData?.displayName || 'User',
      email: loggedUser.email || `${loggedUser.uid}@socialwave.app`,
      photoURL: loggedUser.photoURL || userData?.photoURL || `https://ui-avatars.com/api/?name=${name || loggedUser.displayName || 'User'}&background=random`,
      theme: theme || userData?.theme || 'light',
      bio: userData?.bio || '',
      updatedAt: serverTimestamp()
    };

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        ...baseData,
        createdAt: serverTimestamp(),
      });
    } else {
      // Update existing doc to ensure it has all required fields
      await updateDoc(userRef, baseData);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setError('');
    setAuthLoading(true);
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        await createUserDoc(result.user);
      }
    } catch (error: any) {
      console.error('Google Login error:', error.message);
      if (error.code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked. Please allow popups or use email.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError(`Sign-in failed: ${error.message}`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle redirect result
  React.useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          await createUserDoc(result.user);
        }
      } catch (error: any) {
        console.error('Redirect result error:', error.message);
      }
    };
    checkRedirect();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    try {
      if (isRegistering) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        await createUserDoc(result.user, displayName);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await createUserDoc(result.user);
      }
      setShowEmailAuth(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  // Background sync: Ensure user document exists if logged in
  React.useEffect(() => {
    if (user && userDoc && !userDoc.exists() && !loading) {
      console.log('User document missing, attempting to create...');
      createUserDoc(user);
    }
  }, [user, userDoc, loading]);

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
    <>
      <button
        onClick={() => setShowEmailAuth(true)}
        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20"
      >
        <LogIn size={18} />
        <span>Sign In</span>
      </button>

      {showEmailAuth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-black/5 dark:border-white/5">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-display font-bold text-stone-900 dark:text-stone-50">
                {isRegistering ? 'Create Account' : 'Welcome Back'}
              </h2>
              <button 
                onClick={() => setShowEmailAuth(false)}
                className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
              >
                <LogIn size={20} className="rotate-180 text-stone-400" />
              </button>
            </div>

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
                <p className="text-xs text-rose-500 font-medium px-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-4 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-2xl font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {authLoading ? (
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
              className="w-full py-3.5 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 text-stone-900 dark:text-stone-50 rounded-2xl font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-all flex items-center justify-center gap-3 shadow-sm"
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
        </div>
      )}
    </>
  );
};
