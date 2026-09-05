import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Bell,
  Heart,
  Home,
  LogOut,
  MapPin,
  Package,
  Settings,
  Star,
  Store,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useNotifications } from '../hooks/useApi'

import api from '../services/api'

import NotificationBell from './NotificationBell'

interface Props {
  children: ReactNode
  title?: string
}

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Beranda', href: '/profil', icon: Home },
      { label: 'Notifikasi', href: '/notifikasi', icon: Bell },
    ],
  },
  {
    label: 'Transaksi',
    items: [
      { label: 'Pesanan Saya', href: '/pesanan', icon: Package },
      { label: 'Ulasan Saya', href: '/profil/ulasan', icon: Star },
      { label: 'Laporan Keuangan', href: '/profil/laporan-keuangan', icon: WalletCards },
    ],
  },
  {
    label: 'Akun',
    items: [
      { label: 'Alamat', href: '/profil/alamat', icon: MapPin },
      { label: 'Wishlist', href: '/profil/wishlist', icon: Heart },
      { label: 'Pengaturan', href: '/profil/pengaturan', icon: Settings },
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
  const activeMobileLinkRef = useRef<HTMLAnchorElement>(null)
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

  useEffect(() => {
    activeMobileLinkRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [location.pathname])

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
    `group inline-flex min-h-11 items-center gap-3 whitespace-nowrap text-[13px] uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E1E1E] md:border-l-2 md:pl-4 ${
      active
        ? 'text-[#1E1E1E] md:border-[#1E1E1E]'
        : 'text-[#6F6F71] hover:text-[#1E1E1E] md:border-transparent'
    }`

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
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
          <div className="flex shrink-0 items-center gap-1">
            <Link
              to="/produk"
              aria-label="Kembali ke Toko"
              className="inline-flex min-h-11 items-center gap-2 px-2 text-[11px] uppercase tracking-[0.12em] text-[#1E1E1E] transition-colors hover:bg-[#F9F7F2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E1E1E]"
            >
              <Store className="size-4" strokeWidth={1.75} aria-hidden="true" />
              <span className="hidden min-[390px]:inline">Toko</span>
            </Link>
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
              className="inline-flex min-h-11 items-center gap-2 px-2 text-[11px] uppercase tracking-[0.12em] text-[#AE4B4B] transition-colors hover:text-[#8F3A3A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AE4B4B]"
            >
              <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />
              <span className="hidden sm:inline">Keluar</span>
              <span className="sr-only sm:hidden">Keluar</span>
            </button>
          </div>
        </div>
        <nav aria-label="Menu akun" className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
          {flatItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                ref={active ? activeMobileLinkRef : undefined}
                aria-current={active ? 'page' : undefined}
                className={navLinkClass(active)}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{item.label}</span>
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

        <nav aria-label="Menu akun" className="flex flex-col gap-8">
          {NAV_GROUPS.map((group, i) => (
            <div key={group.label ?? `g${i}`} className="flex flex-col gap-3">
              {group.label && (
                <span className="uppercase tracking-[0.12em] text-[11px] text-[#9A9A96]">{group.label}</span>
              )}
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={navLinkClass(active)}
                    >
                      <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      <span>{item.label}</span>
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

        <div className="mt-auto pt-8">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-11 items-center gap-3 pl-[18px] text-left text-[13px] uppercase tracking-[0.12em] text-[#AE4B4B] transition-colors hover:text-[#8F3A3A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AE4B4B]"
          >
            <LogOut className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="hidden md:flex items-center justify-between px-10 py-6 border-b border-[#E9E9EA]">
          {title && <h1 className="min-w-0 flex-1 truncate text-lg text-[#1E1E1E]">{title}</h1>}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              to="/produk"
              className="inline-flex min-h-11 items-center gap-2 px-3 text-[11px] uppercase tracking-[0.12em] text-[#1E1E1E] transition-colors hover:bg-[#F9F7F2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E1E1E]"
            >
              <Store className="size-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Kembali ke Toko</span>
            </Link>
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
