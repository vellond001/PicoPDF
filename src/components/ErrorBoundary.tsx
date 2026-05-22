import React, { ErrorInfo, ReactNode } from 'react';
import { LogOut, RefreshCw, AlertTriangle } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface Props {
  children: ReactNode;
  onResetSession: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Failed to sign out during recovery:', e);
    }
    
    // Clear local storage and session storage to reset completely
    localStorage.clear();
    sessionStorage.clear();
    
    this.props.onResetSession();
    this.setState({ hasError: false, error: null });
    
    // Fallback: force page reload
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || '';
      const isAuthStateError = errorMsg.toLowerCase().includes('firebase') || errorMsg.toLowerCase().includes('auth');
      
      return (
        <div className="flex h-dvh w-dvw flex-col items-center justify-center bg-neutral-50 text-neutral-900 font-sans p-6 text-center">
          <AlertTriangle className="w-16 h-16 text-rose-500 mb-6" />
          <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-neutral-500 max-w-md mx-auto mb-8">
            The application encountered an unexpected error. 
            {isAuthStateError ? ' This appears to be an authentication state conflict.' : ' You can try resetting your session to recover.'}
          </p>
          
          <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-8 text-left max-w-lg w-full overflow-auto text-sm text-rose-600 font-mono shadow-sm">
            {this.state.error?.message}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); }}
              className="px-6 py-3 border border-neutral-300 rounded-lg font-medium text-neutral-700 hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
            <button
              onClick={this.handleReset}
              className="px-6 py-3 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Reset Session
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
