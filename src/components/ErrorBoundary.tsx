import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for debugging; replace with telemetry sink if/when added.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        role="alert"
        className="flex min-h-dvh items-center justify-center bg-background px-6"
      >
        <div className="max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-medium text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground">
            The app hit an unexpected snag. Your data is safe — a quick reload
            usually puts things right.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
