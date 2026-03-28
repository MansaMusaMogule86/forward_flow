import React, { Component, ReactNode } from 'react';
import logo from "@/assets/images/branding/logo-transparent.png";
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class BrandedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-white to-secondary/5">
          <div className="text-center max-w-2xl px-4 py-12">
            <div className="mb-8 flex justify-center">
              <img 
                src={logo}
                alt="Forward Focus Elevation"
                className="h-20 w-auto"
              />
            </div>

            <div className="flex justify-center mb-6">
              <div className="p-4 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Something Went Wrong
            </h1>
            
            <p className="text-lg text-foreground/70 mb-8 max-w-md mx-auto">
              We encountered an unexpected error. Don't worry—your progress is safe. 
              Try refreshing or return home to continue your journey.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-8 p-4 bg-muted rounded-lg text-left text-sm">
                <p className="font-semibold mb-2">Error Details:</p>
                <pre className="text-xs overflow-auto">{this.state.error.message}</pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={this.handleRetry}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Try Again
              </Button>
              
              <Button 
                onClick={this.handleReload}
                variant="outline"
                size="lg"
              >
                <Home className="mr-2 h-5 w-5" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
