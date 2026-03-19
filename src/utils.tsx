import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export function safeStringify(obj: any): string {
  try {
    const cache = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }
      return value;
    }, 2);
  } catch (err) {
    console.error('safeStringify failed:', err);
    return '[Unstringifyable Object]';
  }
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error.message, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      let isQuota = false;

      try {
        const errorStr = this.state.error?.message || '';
        if (errorStr.startsWith('{')) {
          const parsed = JSON.parse(errorStr);
          errorMessage = parsed.error || errorMessage;
        } else {
          errorMessage = errorStr;
        }
        
        isQuota = errorMessage.toLowerCase().includes('quota') || 
                  errorMessage.toLowerCase().includes('resource-exhausted') ||
                  errorMessage.toLowerCase().includes('limit exceeded');
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50 dark:bg-stone-950">
          <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-black/5 dark:border-white/5 text-center space-y-8">
            <div className={`${isQuota ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-red-50 dark:bg-red-900/20'} w-20 h-20 rounded-3xl flex items-center justify-center mx-auto transition-colors`}>
              <AlertCircle className={`${isQuota ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'} w-10 h-10`} />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-display font-bold text-stone-900 dark:text-stone-50">
                {isQuota ? 'Daily Limit Reached' : 'Something went wrong'}
              </h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">
                {isQuota 
                  ? "The community has been exceptionally active today! We've reached the daily free limit for database reads. Everything will be back online when the quota resets tomorrow."
                  : errorMessage}
              </p>
              {isQuota && (
                <p className="text-[10px] uppercase tracking-widest font-bold text-stone-300 dark:text-stone-600 pt-4">
                  Quota resets at Midnight US Pacific Time
                </p>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-2xl font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-all shadow-lg shadow-stone-900/10 dark:shadow-white/5"
            >
              <RefreshCcw size={20} />
              <span>{isQuota ? 'Check Again' : 'Reload App'}</span>
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export function handleApiError(error: unknown, operation: string, path: string | null) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.error(`API Error [${operation}] at ${path}:`, errorMsg);
  throw new Error(errorMsg);
}
