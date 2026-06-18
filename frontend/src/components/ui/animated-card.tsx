import { HTMLMotionProps, motion } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode
  delay?: number
  index?: number
}

export function AnimatedCard({ children, delay = 0, index = 0, className, ...props }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        ease: [0.25, 0.1, 0.25, 1],
        delay: delay || index * 0.1 
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}
