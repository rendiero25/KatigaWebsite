import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import UserLayout from '../components/UserLayout'
import { useNotifications } from '../hooks/useApi'
import type { AppNotification } from '../types/ecommerce'
import { Skeleton } from '@/components/ui/skeleton'

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  return `${Math.floor(hours / 24)} hari lalu`
}

export default function Notifikasi() {
  const navigate = useNavigate()
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications('customer')

  const handleClick = (notif: AppNotification) => {
    markAsRead(notif._id)
    if (notif.link) navigate(notif.link)
  }

  return (
    <UserLayout title="Notifikasi">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-[#4A4A4A]">
          {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
        </p>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="border border-[#E8E8E5] text-[#4A4A4A] text-sm rounded-md px-3 py-1.5 hover:bg-[#F7F7F5] transition-colors"
          >
            Tandai semua dibaca
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-lg border border-[#E8E8E5] bg-white p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="size-10 text-[#D0D0CC] mb-3" />
          <p className="text-sm font-medium text-[#4A4A4A]">Tidak ada notifikasi</p>
          <p className="text-xs text-[#9A9A9A] mt-1">Notifikasi baru akan muncul di sini</p>
        </div>
      ) : (
        <div className="rounded-lg border border-[#E8E8E5] bg-white overflow-hidden">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => handleClick(n)}
              className={
                n.isRead
                  ? 'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[#F0F0EC] last:border-0 hover:bg-[#FAFAF9]'
                  : 'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[#F0F0EC] last:border-0 bg-[#F7F7F5] hover:bg-[#F0F0EC]'
              }
            >
              <span className="shrink-0 mt-1.5">
                {n.isRead ? (
                  <span className="block size-1.5" />
                ) : (
                  <span className="block size-1.5 rounded-full bg-[#4F68AF]" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.isRead ? 'text-[#4A4A4A]' : 'font-medium text-[#1F1F1F]'}`}>
                  {n.title}
                </p>
                <p className="text-xs text-[#9A9A9A] mt-0.5 line-clamp-2">{n.message}</p>
              </div>
              <span className="text-xs text-[#9A9A9A] shrink-0 ml-2 mt-0.5 whitespace-nowrap">
                {timeAgo(n.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </UserLayout>
  )
}
