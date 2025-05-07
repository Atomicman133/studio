
"use client";

import Link from "next/link";
import {
  Briefcase,
  FileText,
  GraduationCap,
  Gavel,
  ShieldCheck,
  Settings,
  Users,
  ChevronDown,
  Sun,
  Moon,
  LayoutDashboard,
  Plane,
  FileSearch,
  ClipboardList, 
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import * as React from "react"; 

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  subItems?: NavItem[];
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meetings", label: "Meeting Records", icon: FileText },
  { href: "/training", label: "Training Overview", icon: GraduationCap },
  {
    href: "/pdps",
    label: "Prof. Development",
    icon: Briefcase,
  },
  { href: "/discipline", label: "Discipline Actions", icon: Gavel },
  { href: "/audits", label: "Safety Audits", icon: ShieldCheck },
  { href: "/squadron-visits", label: "Squadron Visits", icon: ClipboardList }, 
  { href: "/reporting", label: "Compliance Reporting", icon: FileSearch }, 
  { href: "/staff", label: "Staff Management", icon: Users },
];

function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div style={{ width: '2.5rem', height: '2.5rem' }} />; 
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

function UserNav() {
   const [mounted, setMounted] = React.useState(false);
   React.useEffect(() => setMounted(true), []);

   if (!mounted) {
    return <div className="h-10 w-10 rounded-full bg-muted" />;
   }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src="https://picsum.photos/100/100" alt="User avatar" data-ai-hint="user avatar" />
            <AvatarFallback>UR</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavMenuItemContent({
  item,
  isCollapsed,
}: {
  item: NavItem;
  isCollapsed: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

  return (
    <Link href={item.href} className="w-full">
      <SidebarMenuButton
        className={cn(
          "w-full justify-start", 
          isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 dark:bg-sidebar-primary dark:text-sidebar-primary-foreground dark:hover:bg-sidebar-primary/90"
        )}
        tooltip={isCollapsed ? item.label : undefined}
        isActive={isActive}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        <span className={cn("truncate", isCollapsed && "hidden")}>{item.label}</span>
      </SidebarMenuButton>
    </Link>
  );
}


function AppLayoutInternal({ children }: { children: React.ReactNode }) {
  const { isMobile, open: isSidebarOpen, setOpen: setSidebarOpen, openMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const isCollapsed = !isMobile && !isSidebarOpen;


  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        collapsible="icon"
        className="border-r shadow-sm transition-all duration-300 ease-in-out hidden md:flex"
      >
        <SidebarHeader className="p-3 flex items-center justify-between border-b">
           <Link href="/" className={cn("flex items-center gap-2", isCollapsed && "justify-center")}>
            <Plane className="h-7 w-7 text-primary" />
            {!isCollapsed && <h1 className="text-lg font-semibold text-primary truncate">Squadron Manager</h1>}
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <NavMenuItemContent item={item} isCollapsed={isCollapsed} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-3 border-t">
          {!isCollapsed && <p className="text-xs text-muted-foreground truncate">&copy; 2024 AAFC</p>}
           {isCollapsed && <Settings className="h-5 w-5 mx-auto text-muted-foreground" />}
        </SidebarFooter>
      </Sidebar>

       {isMobile && (
        <Sidebar
            collapsible="offcanvas"
            className="md:hidden"
        >
            <SidebarHeader className="p-3 flex items-center justify-between border-b">
                <Link href="/" className="flex items-center gap-2">
                    <Plane className="h-7 w-7 text-primary" />
                    <h1 className="text-lg font-semibold text-primary truncate">Squadron Manager</h1>
                </Link>
            </SidebarHeader>
            <SidebarContent className="p-2">
                <SidebarMenu>
                    {navItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                        <NavMenuItemContent item={item} isCollapsed={false} />
                    </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>
             <SidebarFooter className="p-3 border-t">
                <p className="text-xs text-muted-foreground truncate">&copy; 2024 AAFC</p>
            </SidebarFooter>
        </Sidebar>
      )}


      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6 shadow-sm">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
            {/* Placeholder for breadcrumbs or page title */}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <UserNav />
          </div>
        </header>
        <SidebarInset className="p-4 sm:p-6 lg:p-8 bg-muted/20 dark:bg-muted/10 overflow-y-auto flex-1">
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Render a static layout or null for SSR to avoid hydration mismatch until client-side takes over
    return (
      <div className="flex min-h-screen w-full">
        <div className="hidden md:flex md:flex-col md:w-[16rem] border-r bg-background shadow-sm">
          {/* Static Sidebar Placeholder for SSR */}
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6 shadow-sm">
            {/* Static Header Placeholder for SSR */}
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/20 dark:bg-muted/10">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppLayoutInternal>{children}</AppLayoutInternal>
    </SidebarProvider>
  );
}
