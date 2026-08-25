import { FiBell } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import type { AppNotification, NotificationRole } from '../types/ecommerce'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Props {
  role: NotificationRole
  notifications: AppNotification[]
  unreadCount: number
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}j`
  return `${Math.floor(hours / 24)}h`
}

export default function NotificationBell({ role, notifications, unreadCount, onMarkRead, onMarkAllRead }: Props) {
  const navigate = useNavigate()
  const viewAllPath = role === 'admin' ? '/admin/notifikasi' : '/notifikasi'

  const handleClick = (notif: AppNotification) => {
    onMarkRead(notif._id)
    if (notif.link) navigate(notif.link)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative cursor-pointer bg-transparent border-0 p-0 focus:outline-none">
        <FiBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#4F68AF] text-white text-[9px] leading-none flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80 rounded-none shadow-none border border-[#E9E9EA] bg-white p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <p className="text-sm text-gray-900">Notifikasi</p>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              Tandai semua dibaca
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="bg-[#E9E9EA]" />
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Tidak ada notifikasi</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.slice(0, 8).map((n) => (
              <DropdownMenuItem
                key={n._id}
                className="flex-col items-start gap-0.5 rounded-none cursor-pointer py-2.5 px-3 border-b border-[#E9E9EA] last:border-0 focus:bg-gray-50 data-highlighted:bg-gray-50"
                onClick={() => handleClick(n)}
              >
                <div className="flex items-center gap-2 w-full">
                  {!n.isRead && <span className="size-1.5 rounded-full bg-[#4F68AF] shrink-0" />}
                  <span className={`text-sm truncate ${n.isRead ? 'text-gray-600' : 'font-medium text-gray-900'}`}>
                    {n.title}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-auto shrink-0">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 pl-3.5">{n.message}</p>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator className="bg-[#E9E9EA]" />
        <DropdownMenuItem
          className="justify-center rounded-none cursor-pointer text-sm text-primary focus:bg-gray-50 data-highlighted:bg-gray-50"
          onClick={() => navigate(viewAllPath)}
        >
          Lihat semua
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
