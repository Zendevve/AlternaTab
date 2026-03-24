import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * React Error Boundary for catching rendering failures
 *
 * Note: This only catches render-time exceptions, not:
 * - Async background failures
 * - Event handler failures
 * - Message transport failures
 *
 * For complete error handling, also need:
 * - Background try/catch + structured errors (already implemented)
 * - Message response validation at runtime (already implemented)
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-state">
          <h2>Something went wrong</h2>
          <p>The launcher encountered an error.</p>
          {this.state.error && (
            <pre className="error-message">
              {this.state.error.message}
            </pre>
          )}
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
