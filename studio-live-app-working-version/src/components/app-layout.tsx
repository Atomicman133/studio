
"use client";

import Link from "next/link";
import {
  Briefcase,
  FileText,
  Gavel,
  ShieldCheck,
  Settings,
  Users,
  LogIn, 
  LogOut, 
  LayoutDashboard,
  Plane,
  FileSearch, 
  ClipboardList, 
  UserCircle,
  Sun,
  Moon,
  BarChart3, 
  Newspaper,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation"; 
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import * as React from "react"; 
import { useAuth } from "@/contexts/auth-context"; 

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  subItems?: NavItem[];
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meetings", label: "Meeting Records", icon: FileText },
  {
    href: "/rxo-rxi",
    label: "RXO / RXI",
    icon: ClipboardList,
    subItems: [
      { href: "/rxo-rxi", label: "Regional Dashboard", icon: ClipboardList },
      { href: "/pdps", label: "Prof. Development", icon: Briefcase },
      { href: "/discipline", label: "Discipline Actions", icon: Gavel },
      { href: "/audits", label: "Safety Audits", icon: ShieldCheck },
      { href: "/squadron-visits", label: "Squadron Visits", icon: Plane },
    ],
  },
  { href: "/reporting", label: "Compliance", icon: BarChart3 }, 
  { href: "/reports", label: "Reports", icon: FileSearch },
  { href: "/staff", label: "Staff Management", icon: Users },
  { href: "/patch-notes", label: "Patch Notes", icon: Newspaper },
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
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" /> }
    </Button>
  );
}

function UserNav() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted || loading) { 
    return <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />;
  }

  if (!user) {
    return (
      <Button variant="outline" onClick={() => router.push('/auth')}>
        <LogIn className="mr-2 h-4 w-4" />
        Login
      </Button>
    );
  }

  const getInitials = (email?: string | null, displayName?: string | null) => {
    if (displayName) {
      const names = displayName.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return displayName.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "UR";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.photoURL || `https://avatar.vercel.sh/${user.email || user.uid}.png`} alt={user.displayName || user.email || "User avatar"} data-ai-hint="user avatar" />
            <AvatarFallback>{getInitials(user.email, user.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.displayName || "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/profile')}> 
          <UserCircle className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppLayoutInternal({ children }: { children: React.ReactNode }) {
  const { isMobile, open: isSidebarOpen, state: sidebarState } = useSidebar();
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();

  const hideSidebarAndHeader = pathname === '/auth';

  if (hideSidebarAndHeader) {
    return <main>{children}</main>;
  }

  const isCollapsed = sidebarState === "collapsed";
  
  const checkActive = (href: string) => {
    return href === "/" ? pathname === href : pathname.startsWith(href);
  };


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
                {item.subItems && !isCollapsed ? (
                  <Collapsible className="group">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                          className="w-full justify-between"
                          isActive={item.subItems.some(sub => checkActive(sub.href))}
                        >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span className={cn("truncate", isCollapsed && "hidden")}>{item.label}</span>
                        </div>
                        {!isCollapsed && <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className={cn(isCollapsed && "hidden")}>
                        {item.subItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.label}>
                            <Link href={subItem.href} passHref legacyBehavior>
                              <SidebarMenuSubButton isActive={checkActive(subItem.href)}>
                                <subItem.icon />
                                <span>{subItem.label}</span>
                              </SidebarMenuSubButton>
                            </Link>
                          </SidebarMenuSubItem>
                         ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <Link href={item.href} className="w-full">
                    <SidebarMenuButton
                      className="w-full justify-start"
                      isActive={checkActive(item.href)}
                      tooltip={isCollapsed ? item.label : undefined}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className={cn("truncate", isCollapsed && "hidden")}>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                )}
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
                        {item.subItems ? (
                        <Collapsible>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                  className="w-full justify-between"
                                  isActive={item.subItems.some(sub => checkActive(sub.href))}
                              >
                              <div className="flex items-center gap-3">
                                  <item.icon className="h-5 w-5 shrink-0" />
                                  <span className="truncate">{item.label}</span>
                              </div>
                              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                            <SidebarMenuSub>
                                {item.subItems.map((subItem) => (
                                  <SidebarMenuSubItem key={subItem.label}>
                                    <Link href={subItem.href} passHref legacyBehavior>
                                        <SidebarMenuSubButton isActive={checkActive(subItem.href)}>
                                        <subItem.icon />
                                        <span>{subItem.label}</span>
                                        </SidebarMenuSubButton>
                                    </Link>
                                  </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                            </CollapsibleContent>
                        </Collapsible>
                        ) : (
                        <Link href={item.href} className="w-full">
                            <SidebarMenuButton
                            className="w-full justify-start"
                            isActive={checkActive(item.href)}
                            >
                            <item.icon className="h-5 w-5 shrink-0" />
                            <span className="truncate">{item.label}</span>
                            </SidebarMenuButton>
                        </Link>
                        )}
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
  const pathname = usePathname();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    if (pathname === '/auth') {
      return <main>{children}</main>;
    }
    // Basic skeleton loader to avoid layout shift before hydration
    return (
      <div className="flex min-h-screen w-full">
        <div className="hidden md:flex md:flex-col md:w-[16rem] border-r bg-background shadow-sm">
          {/* Skeleton sidebar header */}
          <div className="p-3 border-b h-16"></div>
          {/* Skeleton sidebar content */}
          <div className="p-2 flex-1"></div>
           {/* Skeleton sidebar footer */}
          <div className="p-3 border-t h-12"></div>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6 shadow-sm">
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/20 dark:bg-muted/10">
            {children}
          </main>
        </div>
      </div>
    );
  }
  
  if (pathname === '/auth') {
    return <main>{children}</main>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppLayoutInternal>{children}</AppLayoutInternal>
    </SidebarProvider>
  );
}
