"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Target,
  Settings,
  LogOut,
  Menu,
  Sun,
  CalendarDays,
  FolderKanban,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";
import {
  getDesktopSidebarWidthClass,
  getSidebarLabelAnimationClass,
  resolveSidebarExpanded,
  serializeSidebarExpanded,
  SIDEBAR_EXPANDED_STORAGE_KEY,
  SIDEBAR_WIDTH_TRANSITION_MS,
} from "~/components/layout/sidebar-state";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
}

const mainNavigation = [
  { name: "Today", href: "/today", icon: Sun },
  { name: "This Week", href: "/week", icon: CalendarDays },
  { name: "Calendar", href: "/calendar", icon: Calendar },
];

const secondaryNavigation = [
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Insights", href: "/insights", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

function SidebarNavItem({
  href,
  icon: Icon,
  label,
  isActive,
  isExpanded,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isExpanded: boolean;
  onClick?: () => void;
}) {
  const link = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center rounded-xl transition-all duration-200",
        isExpanded
          ? "mx-2 gap-3 px-3 py-2.5"
          : "mx-auto h-10 w-10 justify-center",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span
        className={cn(
          "truncate whitespace-nowrap text-sm font-medium transition-all duration-200 overflow-hidden",
          getSidebarLabelAnimationClass(isExpanded)
        )}
      >
        {label}
      </span>
    </Link>
  );

  if (isExpanded) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function DesktopNav({
  isExpanded,
  showExpandedContent,
  onToggle,
  onItemClick,
  showToggle = true,
}: {
  isExpanded: boolean;
  showExpandedContent: boolean;
  onToggle?: () => void;
  onItemClick?: () => void;
  showToggle?: boolean;
}) {
  const pathname = usePathname();
  const hasExpandedLayout = isExpanded || showExpandedContent;

  return (
    <TooltipProvider delayDuration={0}>
      <nav className={cn("flex flex-col gap-1 py-3", !hasExpandedLayout && "items-center")}>
        {showToggle && onToggle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className={cn(
                  "h-10 w-10 rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  hasExpandedLayout ? "mx-2 self-end" : "mx-auto"
                )}
                aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
              >
                {hasExpandedLayout ? (
                  <ChevronsLeft className="h-4 w-4" />
                ) : (
                  <ChevronsRight className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {isExpanded ? "Collapse" : "Expand"} sidebar
            </TooltipContent>
          </Tooltip>
        )}

      {/* Main navigation */}
      <div className="mb-2">
        {showExpandedContent && (
          <p className="px-5 py-1.5 text-eyebrow text-muted-foreground">Plan</p>
        )}
        {mainNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <SidebarNavItem
              key={item.name}
              href={item.href}
              icon={item.icon}
              label={item.name}
              isActive={isActive}
              isExpanded={hasExpandedLayout}
              onClick={onItemClick}
            />
          );
        })}
      </div>

      {showExpandedContent && <GoalsTree onItemClick={onItemClick} />}

      {/* Divider */}
      <div className={cn("my-2 border-t border-border/50", isExpanded ? "mx-3" : "mx-4")} />

      {/* Secondary navigation */}
      <div>
        {showExpandedContent && (
          <p className="px-5 py-1.5 text-eyebrow text-muted-foreground">
            Organize
          </p>
        )}
        {secondaryNavigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <SidebarNavItem
              key={item.name}
              href={item.href}
              icon={item.icon}
              label={item.name}
              isActive={isActive}
              isExpanded={hasExpandedLayout}
              onClick={onItemClick}
            />
          );
        })}
      </div>
      </nav>
    </TooltipProvider>
  );
}

// Goals tree component - simplified for overlay
function GoalsTree({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();

  const { data: goals = [] } = api.goal.getAll.useQuery({
    includeCompleted: false,
  });

  if (goals.length === 0) return null;

  return (
    <div>
      <p className="px-3 py-1.5 text-eyebrow text-muted-foreground">Goals</p>
      <div className="space-y-0.5">
        {goals.slice(0, 4).map((goal) => {
          const progress =
            goal.totalTaskCount > 0
              ? Math.round((goal.completedTaskCount / goal.totalTaskCount) * 100)
              : 0;

          return (
            <div key={goal.id} className="group">
              <Link
                href="/goals"
                onClick={onItemClick}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                <Target className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-muted-foreground group-hover:text-foreground">
                  {goal.title}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {progress}%
                </span>
              </Link>

              {/* Nested projects - first 2 only */}
              {goal.projects.slice(0, 2).map((project) => {
                const isActive = pathname === `/projects/${project.id}`;
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    onClick={onItemClick}
                    className={cn(
                      "ml-6 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <FolderKanban className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{project.title}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
        {goals.length > 4 && (
          <Link
            href="/goals"
            onClick={onItemClick}
            className="block px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all {goals.length} goals →
          </Link>
        )}
      </div>
    </div>
  );
}

// User avatar with dropdown
function UserMenu({ user, collapsed }: { user: SidebarProps["user"]; collapsed?: boolean }) {
  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  const avatarContent = (
    <Avatar className={cn("border border-border/50", collapsed ? "h-9 w-9" : "h-8 w-8")}>
      <AvatarImage src={user.image ?? undefined} alt={user.name} />
      <AvatarFallback className="bg-primary/10 text-primary text-sm">
        {user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl hover:bg-muted"
          >
            {avatarContent}
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="h-auto w-full justify-start gap-3 px-3 py-2.5 hover:bg-muted rounded-xl"
          >
            {avatarContent}
            <div className="flex flex-col items-start text-left overflow-hidden">
              <span className="text-sm font-medium truncate w-full">
                {user.name}
              </span>
              <span className="text-muted-foreground text-xs truncate w-full">
                {user.email}
              </span>
            </div>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={collapsed ? "center" : "start"} className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Main sidebar component - icon rail with button-controlled expansion
export function Sidebar({ user }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(false);
  const hasExpandedLayout = isExpanded || showExpandedContent;

  useEffect(() => {
    const storedValue = window.localStorage.getItem(
      SIDEBAR_EXPANDED_STORAGE_KEY,
    );
    const initialExpanded = resolveSidebarExpanded(storedValue);
    setIsExpanded(initialExpanded);
    setShowExpandedContent(initialExpanded);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_EXPANDED_STORAGE_KEY,
      serializeSidebarExpanded(isExpanded),
    );
  }, [isExpanded]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setShowExpandedContent(isExpanded);
    }, Math.round(SIDEBAR_WIDTH_TRANSITION_MS * (isExpanded ? 0.45 : 0.55)));

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isExpanded]);

  const toggleSidebar = () => {
    setIsExpanded((value) => !value);
  };

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col overflow-hidden border-r border-border/50 bg-sidebar transition-[width] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] motion-reduce:transition-none",
        getDesktopSidebarWidthClass(isExpanded)
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-border/50 transition-[padding] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          hasExpandedLayout ? "justify-between px-4" : "justify-center px-0"
        )}
      >
        <Link href="/today" className="group">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-primary/30 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
              <span className="text-lg font-bold text-primary-foreground font-display">A</span>
            </div>
          </div>
        </Link>
        <span
          className={cn(
            "truncate whitespace-nowrap pr-1 font-display text-xl tracking-tight transition-all duration-200 overflow-hidden",
            getSidebarLabelAnimationClass(hasExpandedLayout)
          )}
        >
          Aether
        </span>
      </div>

      <ScrollArea className="flex-1 py-1">
        <DesktopNav
          isExpanded={isExpanded}
          showExpandedContent={showExpandedContent}
          onToggle={toggleSidebar}
        />
      </ScrollArea>

      <div
        className={cn(
          "border-t border-border/50 p-3 transition-all duration-200",
          hasExpandedLayout ? "" : "flex justify-center"
        )}
      >
        <UserMenu user={user} collapsed={!hasExpandedLayout} />
      </div>
    </aside>
  );
}

export function MobileNav({ user }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border/50 px-6">
          <Link
            href="/today"
            className="flex items-center gap-3"
            onClick={() => setOpen(false)}
          >
            <div className="bg-primary h-9 w-9 flex items-center justify-center rounded-xl">
              <span className="text-primary-foreground text-lg font-bold font-display">
                A
              </span>
            </div>
            <span className="font-display text-xl tracking-tight">Aether</span>
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <DesktopNav
            isExpanded
            showExpandedContent
            showToggle={false}
            onItemClick={() => setOpen(false)}
          />
        </ScrollArea>

        {/* User menu */}
        <div className="border-t border-border/50 p-4">
          <UserMenu user={user} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function TopBar({ user }: SidebarProps) {
  return (
    <header className="flex h-14 items-center border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 md:px-6">
      <div className="flex items-center gap-4">
        <MobileNav user={user} />
      </div>
    </header>
  );
}
