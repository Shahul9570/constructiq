import { HTMLMotionProps, motion } from 'framer-motion'
import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps extends HTMLMotionProps<"div"> {
  children: ReactNode
}

export function PageTransition({ children, className, ...props }: PageTransitionProps) {
  const location = useLocation()
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      exit={{ opacity: 0, filter: 'blur(10px)', y: -10 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}
