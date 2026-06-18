import * as React from 'react'
import { Toaster as HotToaster, toast as hotToast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

const Toaster = () => {
  return (
    <HotToaster
      position='top-right'
      toastOptions={{
        className: '',
        style: {
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          fontSize: '0.875rem',
          padding: '12px 16px',
        },
        success: {
          iconTheme: { primary: 'hsl(var(--primary))', secondary: 'hsl(var(--primary-foreground))' },
        },
        error: {
          iconTheme: { primary: 'hsl(var(--destructive))', secondary: 'hsl(var(--destructive-foreground))' },
        },
      }}
    />
  )
}

const toast = hotToast

export { Toaster, toast }
