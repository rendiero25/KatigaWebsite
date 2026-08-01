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
      <div className="w-full">
        <div className="flex items-center justify-between border-b border-[#E9E9EA] pb-4 mb-2">
          <p className="text-[13px] text-[#6F6F71]">
            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
          </p>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="border border-[#E9E9EA] text-[#1E1E1E] uppercase tracking-[0.18em] text-[11px] px-4 py-2 hover:bg-[#F9F7F2] transition-colors"
            >
              Tandai semua dibaca
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="size-8 text-[#D0D0CC] mb-3" />
            <p className="text-[13px] uppercase text-[#1E1E1E]">Tidak ada notifikasi</p>
            <p className="text-[13px] text-[#6F6F71] mt-1">Notifikasi baru akan muncul di sini</p>
          </div>
        ) : (
          <div>
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => handleClick(n)}
                className="flex items-start gap-3 py-4 cursor-pointer transition-colors border-b border-[#E9E9EA] hover:bg-[#F9F7F2]"
              >
                <span className="shrink-0 mt-1.5 size-1.5">
                  {!n.isRead && <span className="block size-1.5 rounded-full bg-[#4F68AF]" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="uppercase text-[13px] text-[#1E1E1E]">{n.title}</p>
                  <p className="text-[13px] text-[#6F6F71] mt-1 line-clamp-2">{n.message}</p>
                </div>
                <span className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71] shrink-0 ml-2 mt-0.5 whitespace-nowrap">
                  {timeAgo(n.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </UserLayout>
  )
}
