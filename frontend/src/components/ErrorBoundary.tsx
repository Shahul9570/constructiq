import React from 'react'
import * as Sentry from '@sentry/react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'

export const ErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-6">
        <AlertTriangle className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        We've been notified of this issue and are working to fix it. Please try reloading the page.
      </p>
      
      {/* Optional: Show error message in development only */}
      {import.meta.env.DEV && (
        <div className="mb-8 p-4 bg-muted rounded-md text-left w-full max-w-2xl overflow-auto text-sm">
          <p className="font-semibold text-destructive">{error.name}: {error.message}</p>
          <pre className="mt-2 text-xs text-muted-foreground">{error.stack}</pre>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={resetError} variant="default" size="lg">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button onClick={() => window.location.href = '/'} variant="outline" size="lg">
          <Home className="mr-2 h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}

export function GlobalErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error} resetError={resetError} />
      )}
      onReset={() => {
        // Optional logic to clear state
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}
