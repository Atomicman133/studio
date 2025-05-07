"use client";

import Link from "next/link";
import {
  Briefcase,
  FileText,
  GraduationCap,
  Gavel,
  ShieldCheck,
  UserCheck,
  Settings,
  Users,
  ChevronDown,
  Sun,
  Moon,
  LayoutDashboard,
  Plane,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
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
import Image from "next/image";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  subItems?: NavItem[];
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meetings", label: "Meeting Logger", icon: FileText },
  { href: "/training", label: "Training Overview", icon: GraduationCap },
  {
    href: "/pdps",
    label: "Prof. Development",
    icon: Briefcase,
  },
  { href: "/discipline", label: "Discipline Actions", icon: Gavel },
  { href: "/audits", label: "Safety Audits", icon: ShieldCheck },
  { href: "/compliance", label: "Staff Compliance", icon: UserCheck },
  { href: "/staff", label: "Staff Management", icon: Users },
];

function ThemeToggle() {
  const { setTheme, theme } = useTheme();

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
          isActive && "bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/20 dark:text-primary-foreground dark:hover:bg-primary/25"
        )}
        tooltip={isCollapsed ? item.label : undefined}
        isActive={isActive}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        <span className={cn(isCollapsed && "hidden")}>{item.label}</span>
      </SidebarMenuButton>
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { open, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        <Sidebar
          collapsible="icon"
          className="border-r shadow-sm transition-all duration-300 ease-in-out"
        >
          <SidebarHeader className="p-4 flex items-center justify-between">
             <Link href="/" className="flex items-center gap-2">
              <Plane className="h-8 w-8 text-primary" />
              {!isCollapsed && <h1 className="text-xl font-semibold text-primary">Squadron Manager</h1>}
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
          <SidebarFooter className="p-4 border-t">
            {!isCollapsed && <p className="text-xs text-muted-foreground">&copy; 2024 AAFC</p>}
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6 shadow-sm">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
              {/* Placeholder for breadcrumbs or page title */}
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <UserNav />
            </div>
          </header>
          <SidebarInset className="p-4 sm:p-6 lg:p-8 bg-muted/40 overflow-y-auto">
            <main className="flex-1 transition-all duration-300 ease-in-out">
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
