import { type ReactNode, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import api from '../services/api'
import { useNotifications } from '../hooks/useApi'
import NotificationBell from './NotificationBell'

interface Props {
  children: ReactNode
  title?: string
}

interface NavItem {
  label: string
  href: string
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Beranda', href: '/profil' },
      { label: 'Notifikasi', href: '/notifikasi' },
    ],
  },
  {
    label: 'Transaksi',
    items: [
      { label: 'Pesanan Saya', href: '/pesanan' },
      { label: 'Ulasan Saya', href: '/profil/ulasan' },
      { label: 'Laporan Keuangan', href: '/profil/laporan-keuangan' },
    ],
  },
  {
    label: 'Akun',
    items: [
      { label: 'Alamat', href: '/profil/alamat' },
      { label: 'Wishlist', href: '/profil/wishlist' },
      { label: 'Pengaturan', href: '/profil/pengaturan' },
    ],
  },
]

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export default function UserLayout({ children, title }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('customerName') || '')
  const [customerAvatar, setCustomerAvatar] = useState(() => localStorage.getItem('customerAvatar') || '')
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications('customer')

  useEffect(() => {
    if (!localStorage.getItem('customerToken')) {
      navigate('/masuk?redirect=' + location.pathname)
    }
  }, [navigate, location.pathname])

  useEffect(() => {
    const sync = () => {
      setCustomerName(localStorage.getItem('customerName') || '')
      setCustomerAvatar(localStorage.getItem('customerAvatar') || '')
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('customerToken')
    localStorage.removeItem('customerName')
    localStorage.removeItem('customerAvatar')
    navigate('/')
  }

  const isActive = (href: string) =>
    href === '/profil'
      ? location.pathname === '/profil'
      : location.pathname === href || location.pathname.startsWith(href + '/')

  const flatItems = NAV_GROUPS.flatMap((g) => g.items)

  const navLinkClass = (active: boolean) =>
    `uppercase tracking-[0.12em] text-[13px] transition-colors whitespace-nowrap ${
      active
        ? 'text-[#1E1E1E] md:border-l-2 md:border-[#1E1E1E] md:pl-4'
        : 'text-[#6F6F71] hover:text-[#1E1E1E] md:pl-[calc(0.5rem+2px)]'
    }`

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-10 bg-white border-b border-[#E9E9EA]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/profil" className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F0EFE9] text-xs text-[#1E1E1E]">
              {customerAvatar ? (
                <img
                  src={api.getImageUrl(customerAvatar)}
                  alt={customerName}
                  className="size-9 rounded-full object-cover"
                />
              ) : (
                customerName ? initials(customerName) : 'U'
              )}
            </span>
            <span className="truncate text-sm text-[#1E1E1E]">{customerName || 'User'}</span>
          </Link>
          <div className="flex items-center gap-3 shrink-0">
            <NotificationBell
              role="customer"
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markAsRead}
              onMarkAllRead={markAllAsRead}
            />
            <button
              type="button"
              onClick={handleLogout}
              className="uppercase tracking-[0.12em] text-[11px] text-[#AE4B4B]"
            >
              Keluar
            </button>
          </div>
        </div>
        <nav className="flex overflow-x-auto no-scrollbar gap-6 px-4 pb-3">
          {flatItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                aria-current={active ? 'page' : undefined}
                className={navLinkClass(active)}
              >
                {item.label}
                {item.href === '/notifikasi' && unreadCount > 0 && (
                  <span className="ml-1 text-[#6F6F71]">({unreadCount > 9 ? '9+' : unreadCount})</span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-[#E9E9EA] md:min-h-screen md:p-8">
        <Link to="/profil" className="flex min-w-0 items-center gap-3 mb-10">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F0EFE9] text-xs text-[#1E1E1E]">
            {customerAvatar ? (
              <img
                src={api.getImageUrl(customerAvatar)}
                alt={customerName}
                className="size-10 rounded-full object-cover"
              />
            ) : (
              customerName ? initials(customerName) : 'U'
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-[#1E1E1E]">{customerName || 'User'}</span>
            <span className="block text-xs text-[#6F6F71]">Pelanggan</span>
          </span>
        </Link>

        <nav className="flex flex-col gap-8">
          {NAV_GROUPS.map((group, i) => (
            <div key={group.label ?? `g${i}`} className="flex flex-col gap-3">
              {group.label && (
                <span className="uppercase tracking-[0.12em] text-[11px] text-[#9A9A96]">{group.label}</span>
              )}
              <div className="flex flex-col gap-3">
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={navLinkClass(active)}
                    >
                      {item.label}
                      {item.href === '/notifikasi' && unreadCount > 0 && (
                        <span className="ml-1 text-[#6F6F71]">({unreadCount > 9 ? '9+' : unreadCount})</span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-8 flex flex-col gap-3">
          <Link to="/produk" className={navLinkClass(false)}>
            Kembali ke Toko
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-left uppercase tracking-[0.12em] text-[13px] text-[#AE4B4B] hover:text-[#8f3a3a] transition-colors"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="hidden md:flex items-center justify-between px-10 py-6 border-b border-[#E9E9EA]">
          {title && <h1 className="text-lg text-[#1E1E1E]">{title}</h1>}
          <div className="ml-auto">
            <NotificationBell
              role="customer"
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markAsRead}
              onMarkAllRead={markAllAsRead}
            />
          </div>
        </header>
        <main className="flex-1 min-w-0 p-4 md:p-10">{children}</main>
      </div>
    </div>
  )
}
