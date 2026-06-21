import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { useNotifications } from '../../hooks/useApi'
import type { AppNotification } from '../../types/ecommerce'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications('admin')

  const handleClick = (notif: AppNotification) => {
    markAsRead(notif._id)
    if (notif.link) navigate(notif.link)
  }

  return (
    <AdminLayout title="Notifikasi">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
        </p>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Tandai semua dibaca
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Tidak ada notifikasi</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n._id}
              className={`cursor-pointer transition-colors hover:bg-gray-50 ${!n.isRead ? 'border-primary/30 bg-primary/5' : ''}`}
              onClick={() => handleClick(n)}
            >
              <CardContent className="py-4 flex items-start gap-3">
                {!n.isRead && <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm ${n.isRead ? 'text-gray-600' : 'font-semibold text-gray-900'}`}>{n.title}</p>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
