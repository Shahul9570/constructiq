import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Building2,
  Package,
  Wrench,
  BarChart3,
  DollarSign,
  FileText,
  Camera,
  FileBarChart,
  Bot,
  Settings,
  X,
  HardHat,
} from 'lucide-react'
import { UserRole } from '@/types'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const adminNavGroups = [
  {
    title: 'Platform Overview',
    items: [
      { label: 'Global Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'All Projects', href: '/projects', icon: FolderKanban },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'System Users', href: '/users', icon: Users },
      { label: 'Global Contractors', href: '/contractors', icon: Building2 },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Financial Overview', href: '/financial', icon: DollarSign },
      { label: 'AI Analytics', href: '/ai', icon: Bot },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

const navGroups = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard',     href: '/dashboard',      icon: LayoutDashboard },
      { label: 'Projects',      href: '/projects',       icon: FolderKanban },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Daily Progress', href: '/daily-progress', icon: BarChart3 },
      { label: 'Labour',         href: '/labour',         icon: Users },
      { label: 'Materials',      href: '/materials',      icon: Package },
      { label: 'Equipment',      href: '/equipment',      icon: Wrench },
      { label: 'Contractors',    href: '/contractors',    icon: Building2 },
    ],
  },
  {
    title: 'Records',
    items: [
      { label: 'Financial',  href: '/financial',  icon: DollarSign },
      { label: 'Documents',  href: '/documents',  icon: FileText },
      { label: 'Photos',     href: '/photos',     icon: Camera },
      { label: 'Reports',    href: '/reports',    icon: FileBarChart },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'AI Assistant', href: '/ai',       icon: Bot },
      { label: 'Settings',     href: '/settings', icon: Settings },
    ],
  },
]

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation()
  const { user } = useAuth()
  const role = user?.role

  // Define allowed labels per role (if they are not super_admin or company_owner)
  const allowedItemsPerRole: Record<string, string[]> = {
    project_manager: [
      'Dashboard', 'Projects', 'Daily Progress', 'Labour', 'Materials', 'Equipment', 
      'Contractors', 'Financial', 'Documents', 'Photos', 'Reports', 'Settings', 'AI Assistant'
    ],
    accountant: [
      'Dashboard', 'Projects', 'Financial', 'Documents', 'Photos', 'Reports', 'Settings'
    ],
    site_engineer: [
      'Dashboard', 'Projects', 'Daily Progress', 'Labour', 'Materials', 'Equipment', 
      'Contractors', 'Documents', 'Photos', 'Reports', 'Settings', 'AI Assistant'
    ],
    contractor: [
      'Dashboard', 'Projects', 'Daily Progress', 'Documents', 'Photos', 'Settings'
    ],
    client: [
      'Dashboard', 'Reports', 'Photos', 'Documents', 'Settings'
    ]
  };

  let filteredNavGroups = navGroups;

  if (role === 'super_admin' || role === 'company_owner') {
    filteredNavGroups = role === 'super_admin' ? adminNavGroups : navGroups;
  } else if (role && allowedItemsPerRole[role]) {
    const allowed = allowedItemsPerRole[role];
    filteredNavGroups = navGroups.map(group => ({
      ...group,
      items: group.items.filter(item => allowed.includes(item.label))
    })).filter(group => group.items.length > 0);
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col transition-transform duration-300 lg:static lg:translate-x-0',
          'border-r border-slate-800',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: '#080E1A' }}
      >
        {/* Brand */}
        <div
          className="flex h-[72px] shrink-0 items-center justify-between px-6 border-b border-slate-800"
        >
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg shadow-orange-950/50 group-hover:scale-105 transition-transform duration-200">
              <HardHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-[15px] font-bold text-white leading-none">ConstructIQ</div>
              <div className="text-[10px] font-medium text-slate-500 mt-0.5 uppercase tracking-widest">Command Center</div>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-500 hover:text-white hover:bg-slate-800 lg:hidden rounded-lg"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
          {filteredNavGroups.map((group, gi) => (
            <div key={gi}>
              <div className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase text-slate-600">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== '/dashboard' && location.pathname.startsWith(item.href + '/'))

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 relative group',
                        isActive
                          ? 'bg-orange-500/10 text-orange-400'
                          : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                      )}
                      <Icon
                        className={cn(
                          'h-[17px] w-[17px] shrink-0 transition-colors',
                          isActive ? 'text-orange-500' : 'text-slate-600 group-hover:text-slate-300'
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer status */}
        <div className="border-t border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse" />
            <span className="text-xs text-slate-500 font-medium">All systems operational</span>
          </div>
        </div>
      </aside>
    </>
  )
}
