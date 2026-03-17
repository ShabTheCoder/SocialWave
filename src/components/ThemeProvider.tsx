import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user] = useAuthState(auth);
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme || 'light';
  });

  // 1. Apply theme to document and localStorage (Side effect of state change)
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 2. Listen for theme changes in Firestore (Pull)
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const remoteTheme = docSnap.data().theme as Theme;
        if (remoteTheme) {
          setTheme(prev => {
            if (prev !== remoteTheme) {
              localStorage.setItem('theme', remoteTheme);
              return remoteTheme;
            }
            return prev;
          });
        }
      }
    }, (error: any) => {
      // Silence quota errors in the console to reduce spam
      if (error.code !== 'resource-exhausted') {
        console.error('Firestore theme sync error:', error.message);
      }
    });

    return () => unsubscribe();
  }, [user]); // Removed theme from dependencies

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Sync to Firestore only on manual toggle
    if (user) {
      const syncToFirestore = async () => {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { theme: newTheme });
        } catch (error: any) {
          if (error.code === 'resource-exhausted') {
            console.warn('Firestore write quota exceeded. Theme saved locally.');
          } else {
            console.error('Error syncing theme to Firestore:', error.message);
          }
        }
      };
      syncToFirestore();
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
