
import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle size={40} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">Oups ! Quelque chose s'est mal passé</h1>
              <p className="text-slate-500 text-sm">
                Une erreur inattendue est survenue. Veuillez rafraîchir la page ou réessayer plus tard.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-red-50 rounded-xl p-4 text-left overflow-hidden">
                <p className="text-xs font-mono text-red-700 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
            >
              <RefreshCw size={18} />
              Actualiser la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
