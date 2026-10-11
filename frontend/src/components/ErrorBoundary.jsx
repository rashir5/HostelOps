import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 max-w-lg mx-auto my-8 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 grid place-items-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Something went wrong, please reload</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              An unexpected error occurred while loading this section.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-blue-600/30"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Page</span>
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition border border-slate-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
