import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  LayoutDashboard,
  Home,
  Info,
  Package,
  BookOpen,
  Newspaper,
  Phone,
  Settings,
  LogOut,
  ChevronRight,
  Layers,
  ShoppingCart,
  ExternalLink,
  Users as UsersIcon,
  MessageSquare,
  Tag,
  BarChart3,
  Truck,
  Bell,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useNotifications } from '../hooks/useApi'
import NotificationBell from './NotificationBell'

interface Props {
  children: ReactNode
  title: string
}

interface ChildMenuItem {
  path: string
  label: string
}

interface MenuItem {
  path: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  children?: ChildMenuItem[]
}

interface MenuGroup {
  label?: string
  items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
  {
    items: [
      { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/admin/notifikasi', icon: Bell, label: 'Notifikasi' },
    ],
  },
  {
    label: 'Halaman Website',
    items: [
      {
        path: '/admin/home',
        icon: Home,
        label: 'Home',
        children: [
          { path: '/admin/hero', label: 'Hero Section' },
          { path: '/admin/partners', label: 'Partners' },
          { path: '/admin/advantages', label: 'Keunggulan' },
          { path: '/admin/manufacturing', label: 'Manufacturing' },
        ],
      },
      {
        path: '/admin/about',
        icon: Info,
        label: 'Tentang Kami',
        children: [
          { path: '/admin/about', label: 'General Info' },
          { path: '/admin/certification-tech', label: 'Technology' },
          { path: '/admin/distribution', label: 'Distribution' },
        ],
      },
      {
        path: '/admin/contact-group',
        icon: Phone,
        label: 'Kontak',
        children: [
          { path: '/admin/contact', label: 'Info Kontak' },
          { path: '/admin/contact-page-content', label: 'Konten Hal. Kontak' },
        ],
      },
      { path: '/admin/footer', icon: Layers, label: 'Footer' },
    ],
  },
  {
    label: 'Produk & Katalog',
    items: [
      {
        path: '/admin/products-group',
        icon: Package,
        label: 'Produk',
        children: [
          { path: '/admin/categories', label: 'Kategori' },
          { path: '/admin/products', label: 'Produk' },
          { path: '/admin/product-page-content', label: 'Konten Hal. Produk' },
        ],
      },
      { path: '/admin/catalog', icon: BookOpen, label: 'E-Catalog' },
    ],
  },
  {
    label: 'Konten',
    items: [{ path: '/admin/news', icon: Newspaper, label: 'Berita' }],
  },
  {
    label: 'Transaksi',
    items: [
      { path: '/admin/orders',     icon: ShoppingCart,  label: 'Pesanan'       },
      { path: '/admin/complaints', icon: MessageSquare, label: 'Komplain/Retur' },
      { path: '/admin/users',      icon: UsersIcon,     label: 'Users'         },
      { path: '/admin/reviews',    icon: MessageSquare, label: 'Ulasan'        },
      { path: '/admin/laporan', icon: BarChart3,     label: 'Laporan' },
    ],
  },
  {
    label: 'Promosi',
    items: [
      {
        path: '/admin/promosi-group',
        icon: Tag,
        label: 'Promosi',
        children: [
          { path: '/admin/promosi', label: 'Kelola Promosi' },
          { path: '/admin/promosi/tampilan', label: 'Tampilan Promosi' },
        ],
      },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { path: '/admin/settings', icon: Settings, label: 'Pengaturan' },
      { path: '/admin/shipping', icon: Truck, label: 'Pengiriman' },
    ],
  },
]

const allMenuItems = menuGroups.flatMap(group => group.items)

export default function AdminLayout({ children, title }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const adminEmail = localStorage.getItem('adminEmail') || 'Admin'
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications('admin')

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    allMenuItems.forEach(item => {
      if (item.children?.some(child => location.pathname === child.path)) {
        initial[item.label] = true
      }
    })
    return initial
  })

  useEffect(() => {
    if (!localStorage.getItem('adminToken')) {
      navigate('/admin/login')
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminEmail')
    navigate('/admin/login')
  }

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const menuClassName =
    'gap-2 [&_[data-sidebar=menu-button]]:cursor-pointer [&_[data-sidebar=menu-sub-button]]:cursor-pointer'

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon
    const isActive =
      location.pathname === item.path ||
      (item.children?.some(child => location.pathname === child.path) ?? false)
    const isExpanded = expandedMenus[item.label] ?? false

    if (item.children) {
      return (
        <SidebarMenuItem key={item.label}>
          <Collapsible
            open={isExpanded}
            onOpenChange={() => toggleMenu(item.label)}
            className="w-full"
          >
            <SidebarMenuButton
              render={<CollapsibleTrigger className="w-full text-left" />}
              isActive={isActive}
              tooltip={item.label}
            >
              <Icon />
              <span>{item.label}</span>
              <ChevronRight
                className={cn(
                  'ml-auto size-4 transition-transform duration-200',
                  isExpanded && 'rotate-90',
                )}
              />
            </SidebarMenuButton>
            <CollapsibleContent>
              <SidebarMenuSub className="gap-1.5 py-1">
                {item.children.map(child => {
                  const isChildActive = location.pathname === child.path
                  return (
                    <SidebarMenuSubItem key={child.path}>
                      <SidebarMenuSubButton
                        render={<Link to={child.path} />}
                        isActive={isChildActive}
                      >
                        <span>{child.label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      )
    }

    return (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton
          render={<Link to={item.path} />}
          tooltip={item.label}
          isActive={isActive}
        >
          <Icon />
          <span>{item.label}</span>
          {item.path === '/admin/notifikasi' && unreadCount > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" className="pointer-events-none select-none">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 via-yellow-400 to-green-500 text-white text-xs font-bold shrink-0">
                    KK
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-sidebar-foreground">KumaKuma</span>
                    <span className="truncate text-xs text-sidebar-foreground/50">Admin Panel</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            {menuGroups.map(group => (
              <SidebarGroup key={group.label ?? 'dashboard'}>
                {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
                <SidebarGroupContent>
                  <SidebarMenu className={menuClassName}>
                    {group.items.map(renderMenuItem)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu className="[&_[data-sidebar=menu-button]]:cursor-pointer">
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Logout"
                  onClick={handleLogout}
                >
                  <LogOut />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <h1 className="text-base font-semibold text-foreground">{title}</h1>
            <div className="ml-auto flex items-center gap-4">
              <NotificationBell
                role="admin"
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkRead={markAsRead}
                onMarkAllRead={markAllAsRead}
              />
              <Link
                to="/"
                target="_blank"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Ke Web Katiga
                <ExternalLink className="size-3.5" />
              </Link>
              <span className="text-sm text-muted-foreground hidden sm:block">{adminEmail}</span>
            </div>
          </header>
          <main className="flex flex-1 flex-col p-6 min-h-0 w-full">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
