import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { api } from '../services/api';

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

  // 1. Apply theme to document and localStorage
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 2. Fetch theme from Backend on login
  useEffect(() => {
    if (!user) return;

    api.getUser(user.uid).then((userData) => {
      if (userData?.theme) {
        setTheme(userData.theme as Theme);
      }
    }).catch(console.error);
  }, [user]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Sync to Backend only on manual toggle
    if (user) {
      api.updateUserTheme(user.uid, newTheme).catch(console.error);
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
