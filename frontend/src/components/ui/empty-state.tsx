import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { HardHat } from 'lucide-react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/50 rounded-2xl glass-panel"
    >
      <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-primary/10 text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
        {icon || <HardHat className="w-8 h-8" />}
      </div>
      <h3 className="mb-2 text-xl font-semibold tracking-tight">{title}</h3>
      <p className="max-w-sm mb-6 text-sm text-muted-foreground">{description}</p>
      {action && <div>{action}</div>}
    </motion.div>
  )
}
