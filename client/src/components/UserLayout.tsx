import { type ReactNode, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, Settings, LogOut, ShoppingBag, MapPin, Heart } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Props {
  children: ReactNode
  title?: string
}

const NAV_MAIN = [
  { label: 'Beranda', icon: LayoutDashboard, href: '/profil' },
  { label: 'Pesanan Saya', icon: Package, href: '/pesanan' },
  { label: 'Alamat', icon: MapPin, href: '/profil/alamat' },
  { label: 'Wishlist', icon: Heart, href: '/profil/wishlist' },
  { label: 'Pengaturan', icon: Settings, href: '/profil/pengaturan' },
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
  const customerName = localStorage.getItem('customerName') || ''

  useEffect(() => {
    if (!localStorage.getItem('customerToken')) {
      navigate('/masuk?redirect=' + location.pathname)
    }
  }, [navigate, location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('customerToken')
    localStorage.removeItem('customerName')
    navigate('/')
  }

  const isActive = (href: string) =>
    href === '/profil'
      ? location.pathname === '/profil'
      : location.pathname === href || location.pathname.startsWith(href + '/')

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" className="pointer-events-none select-none">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white text-xs font-black shrink-0">
                    K
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-sidebar-foreground">Katiga</span>
                    <span className="truncate text-xs text-sidebar-foreground/50">Akun Saya</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_MAIN.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={<Link to={item.href} />}
                          isActive={active}
                          tooltip={item.label}
                        >
                          <Icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link to="/produk" />}
                      tooltip="Kembali ke Toko"
                    >
                      <ShoppingBag />
                      <span>Kembali ke Toko</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" className="pointer-events-none select-none">
                  <Avatar className="size-8 rounded-lg [&::after]:hidden shrink-0">
                    <AvatarFallback className="rounded-lg bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white text-xs font-semibold">
                      {customerName ? initials(customerName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-sidebar-foreground">
                      {customerName || 'User'}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/50">Pelanggan</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Keluar"
                  onClick={handleLogout}
                  className="cursor-pointer text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut />
                  <span>Keluar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        <SidebarInset className="bg-gray-50">
          <header className="flex h-14 shrink-0 items-center gap-2 bg-gray-50 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            {title && <h1 className="text-base font-semibold text-foreground">{title}</h1>}
          </header>
          <main className="flex flex-1 flex-col p-6 min-h-0 w-full bg-gray-50" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
