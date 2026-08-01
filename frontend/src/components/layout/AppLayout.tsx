import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Megaphone, X } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import { PageTransition } from '../ui/page-transition'
import { AnimatePresence } from 'framer-motion'
import { adminService } from '@/services/admin.service'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const location = useLocation()

  const { data: settings } = useQuery({
    queryKey: ['public-platform-settings'],
    queryFn: () => adminService.getPublicSettings(),
    refetchInterval: 15000,
  })

  const announcement = settings?.announcement_banner

  return (
    <div className="flex min-h-screen" style={{ background: '#0F172A' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {announcement && !bannerDismissed && (
          <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-y border-amber-500/30 px-4 py-2.5 flex items-center justify-between text-amber-200 text-xs sm:text-sm font-medium shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2.5 mx-auto">
              <div className="p-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
                <Megaphone className="h-4 w-4 animate-bounce" />
              </div>
              <span><strong className="text-amber-400 font-bold uppercase tracking-wider mr-1.5">[Admin Alert]:</strong>{announcement}</span>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-amber-400 hover:text-amber-200 transition-colors p-1 rounded-lg hover:bg-amber-500/20"
              title="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

