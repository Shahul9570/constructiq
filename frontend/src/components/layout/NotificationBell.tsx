import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { notificationService } from '@/services/notification.service'
import { Notification, NotificationType } from '@/types'

export function NotificationBell() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  // Poll for unread count every 30 seconds
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30000,
  })

  const unreadCount = unreadData?.unread_count || 0

  // Fetch full notifications when dropdown opens
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(20),
    enabled: isOpen,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    }
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    }
  })

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id)
    }

    setIsOpen(false)

    // Navigate based on type
    if (notification.type === NotificationType.PAYMENT_SUBMITTED) {
      navigate('/financial')
    } else if (notification.type === NotificationType.PAYMENT_VERIFIED) {
      navigate('/billing') // client portal
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white shadow-[0_0_6px_rgba(249,115,22,0.7)] transform translate-x-1 -translate-y-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        className="w-80 bg-slate-900 border-slate-700/60 text-slate-200 shadow-xl rounded-xl p-0"
        align="end"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-orange-400 hover:text-orange-300 hover:bg-transparent"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-slate-500">Loading...</div>
          ) : notifications?.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center">
              <Check className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">You're all caught up!</p>
            </div>
          ) : (
            notifications?.map((notification) => (
              <div key={notification.id}>
                <DropdownMenuItem 
                  className={`px-4 py-3 cursor-pointer flex flex-col items-start gap-1 rounded-none hover:bg-slate-800/80 focus:bg-slate-800/80 ${
                    !notification.is_read ? 'bg-slate-800/40' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between w-full">
                    <span className={`text-sm ${!notification.is_read ? 'font-medium text-white' : 'text-slate-300'}`}>
                      {notification.message}
                    </span>
                    {!notification.is_read && (
                      <span className="flex h-2 w-2 rounded-full bg-orange-500 mt-1 flex-shrink-0 ml-2" />
                    )}
                  </div>
                  <div className="flex items-center text-[11px] text-slate-500 mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="m-0 bg-slate-800/50" />
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
