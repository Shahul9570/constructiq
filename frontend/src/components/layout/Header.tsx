import { useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Menu, User, Settings, LogOut, Bell, Search, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ProjectSwitcher } from './ProjectSwitcher'
import { NotificationBell } from './NotificationBell'

interface HeaderProps {
  onMenuClick: () => void
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':     { title: 'Dashboard',      subtitle: 'Command Overview' },
  '/projects':      { title: 'Projects',       subtitle: 'All active projects' },
  '/labour':        { title: 'Labour',         subtitle: 'Daily workforce tracking' },
  '/contractors':   { title: 'Contractors',    subtitle: 'Contractor management' },
  '/materials':     { title: 'Materials',      subtitle: 'Inventory & procurement' },
  '/equipment':     { title: 'Equipment',      subtitle: 'Site equipment' },
  '/daily-progress':{ title: 'Daily Progress', subtitle: 'Site operations log' },
  '/financial':     { title: 'Financial',      subtitle: 'Budget & expenditure' },
  '/documents':     { title: 'Documents',      subtitle: 'Project documentation' },
  '/photos':        { title: 'Photos',         subtitle: 'Site imagery' },
  '/reports':       { title: 'Reports',        subtitle: 'Analytics & insights' },
  '/users':         { title: 'Users',          subtitle: 'System user management' },
  '/ai':            { title: 'AI Assistant',   subtitle: 'Powered by AI' },
  '/settings':      { title: 'Settings',       subtitle: 'Platform configuration' },
}

export default function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation()
  const { user, logout } = useAuth()

  const pageInfo = Object.entries(pageTitles).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] ?? { title: 'ConstructIQ', subtitle: 'Construction Command Center' }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <header
      className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center gap-4 px-5 sm:px-7"
      style={{
        background: 'rgba(8,14,26,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(51,65,85,0.5)',
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Project switcher */}
      {user?.role !== 'client' && user?.role !== 'super_admin' && (
        <div className="hidden md:block">
          <ProjectSwitcher />
        </div>
      )}

      {/* Page title — visible on large screens */}
      <div className="hidden lg:flex flex-col justify-center">
        <h1 className="text-[15px] font-semibold text-white leading-tight">{pageInfo.title}</h1>
        <p className="text-[11px] text-slate-500 leading-tight">{pageInfo.subtitle}</p>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden md:flex">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          placeholder="Search..."
          className="w-56 pl-9 bg-slate-800/60 border-slate-700/50 text-slate-200 placeholder:text-slate-500 focus-visible:ring-orange-500/30 focus-visible:border-orange-500/40 rounded-xl text-sm h-9"
        />
      </div>

      {/* Bell */}
      <NotificationBell />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2.5 rounded-xl hover:bg-slate-800 px-2.5 h-10"
          >
            <Avatar className="h-7 w-7 border border-slate-700">
              <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
              <AvatarFallback className="bg-orange-500/20 text-orange-400 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-[13px] font-medium text-white leading-none">
                {user?.full_name?.split(' ')[0] ?? user?.username}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500 hidden md:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 bg-slate-900 border-slate-700/60 text-slate-200 shadow-xl rounded-xl"
          align="end"
          forceMount
        >
          <div className="px-3 py-2.5 border-b border-slate-800">
            <p className="text-sm font-semibold text-white">{user?.full_name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <div className="p-1 mt-1">
            <DropdownMenuItem className="rounded-lg cursor-pointer text-slate-300 hover:text-white hover:bg-slate-800 focus:bg-slate-800">
              <User className="mr-2.5 h-4 w-4 text-slate-500" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg cursor-pointer text-slate-300 hover:text-white hover:bg-slate-800 focus:bg-slate-800">
              <Settings className="mr-2.5 h-4 w-4 text-slate-500" />
              Settings
            </DropdownMenuItem>
          </div>
          <DropdownMenuSeparator className="bg-slate-800" />
          <div className="p-1">
            <DropdownMenuItem
              className="rounded-lg cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300"
              onClick={logout}
            >
              <LogOut className="mr-2.5 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
