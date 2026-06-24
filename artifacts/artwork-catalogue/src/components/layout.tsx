import { Link, useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarProvider,
  SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarTrigger, SidebarInset, useSidebar,
} from "@/components/ui/sidebar";
import { Home, Library, MapPin, CalendarClock, FileText, Plus, Settings, Users, Target, Upload, LogOut } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Collection", href: "/artworks", icon: Library },
  { label: "Artist List", href: "/artists", icon: Users },
  { label: "Locations", href: "/locations", icon: MapPin },
  { label: "Loans", href: "/loans", icon: CalendarClock },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

function SidebarNav() {
  const [location] = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();
  const { profile, signOut } = useAuth();

  function closeIfNeeded() { if (isMobile) setOpenMobile(false); }

  const ownerName = profile?.full_name || "";

  return (
    <>
      <SidebarHeader className="px-6 pt-7 pb-4">
        {ownerName ? (
          <div className="leading-tight mb-1">
            {ownerName.split(" ").length > 1 ? (
              <>
                <p className="text-[13px] tracking-[0.12em] uppercase font-light text-foreground/80">{ownerName.split(" ").slice(0, -1).join(" ")}</p>
                <p className="text-[13px] tracking-[0.12em] uppercase font-light text-foreground/80">{ownerName.split(" ").slice(-1)[0]}</p>
              </>
            ) : (
              <p className="text-[13px] tracking-[0.12em] uppercase font-light text-foreground/80">{ownerName}</p>
            )}
          </div>
        ) : <div className="mb-1 h-8" />}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 px-4 py-4">
              {navItems.map(item => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild
                    isActive={location === item.href || (item.href !== "/" && location.startsWith(item.href))}
                    className="font-medium tracking-wide text-[13px] text-muted-foreground hover:text-foreground data-[active=true]:text-foreground data-[active=true]:bg-accent/50">
                    <Link href={item.href} className="flex items-center gap-3 py-2" onClick={closeIfNeeded}>
                      <item.icon className="h-4 w-4" /><span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <div className="my-4 h-px bg-border/50" />
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="font-medium tracking-wide text-[13px] text-primary hover:text-primary hover:bg-primary/5">
                  <Link href="/artworks/new" className="flex items-center gap-3 py-2" onClick={closeIfNeeded}>
                    <Plus className="h-4 w-4" /><span>Add Artwork</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="font-medium tracking-wide text-[13px] text-muted-foreground hover:text-foreground">
                  <Link href="/batch-upload" className="flex items-center gap-3 py-2" onClick={closeIfNeeded}>
                    <Upload className="h-4 w-4" /><span>Batch Upload</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-6 pb-6 pt-4">
        <div className="h-px bg-border/50 mb-5" />
        <Link href="/" onClick={closeIfNeeded}>
          <img src="/hourglass-logo.jpg" alt="Hourglass" className="w-full max-w-[112px] mb-3 object-contain" />
        </Link>
        <div className="leading-snug space-y-0.5 mb-4">
          <p className="text-[11px] tracking-[0.18em] uppercase font-light text-muted-foreground">Collection</p>
          <p className="text-[11px] tracking-[0.18em] uppercase font-light text-muted-foreground">Tracker</p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground px-0 h-7">
          <LogOut className="h-3.5 w-3.5" />
          <span className="text-xs">Sign out</span>
        </Button>
      </SidebarFooter>
    </>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground font-sans">
        <Sidebar variant="sidebar" className="border-r border-border/50 bg-sidebar">
          <SidebarNav />
        </Sidebar>
        <SidebarInset className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
          <header className="h-14 border-b border-border/50 flex items-center px-6 lg:hidden">
            <SidebarTrigger />
            <span className="ml-4 text-sm tracking-widest uppercase text-muted-foreground font-light">Collection Tracker</span>
          </header>
          <main className="flex-1 overflow-y-auto w-full max-w-screen-xl mx-auto px-6 py-8 md:px-12 md:py-12 animate-in fade-in duration-500">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
