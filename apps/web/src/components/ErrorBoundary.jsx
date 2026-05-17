import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Keep console output for dev diagnostics.
    console.error('UI crashed:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearAuthAndReload = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {
      // ignore
    }
    window.location.assign('/login');
  };

  render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (!hasError) return children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardContent>
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-status-error">error</span>
              <h1 className="text-lg font-semibold">UI crashed</h1>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Something threw a runtime error after login. Use the buttons below, and copy the error
              text if you want me to pinpoint the exact component.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button type="button" variant="secondary" onClick={this.handleReload}>
                Reload
              </Button>
              <Button type="button" variant="destructive" onClick={this.handleClearAuthAndReload}>
                Clear login and go to /login
              </Button>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap break-words">
              {String(error?.stack || error?.message || error || 'Unknown error')}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
