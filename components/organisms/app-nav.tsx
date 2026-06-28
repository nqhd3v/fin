"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  ChartBar,
  UsersThree,
  User,
  ShieldStar,
  Code,
  type Icon,
} from "@phosphor-icons/react";

// `wip` flags a route still under development — shown with a Developer badge.
type NavItem = { href: string; label: string; icon: Icon; wip?: boolean };

const ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/insights", label: "Insights", icon: ChartBar, wip: true },
  { href: "/groups", label: "Groups", icon: UsersThree },
  { href: "/profile", label: "Profile", icon: User },
];

const ADMIN_ITEM: NavItem = { href: "/admin", label: "Admin", icon: ShieldStar };

function useActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Vertical sidebar on md+ screens (laptop/desktop). */
function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const isActive = useActive();
  const items = isAdmin ? [...ITEMS, ADMIN_ITEM] : ITEMS;
  return (
    <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col gap-1 border-r border-foreground/10 bg-card p-3 md:flex">
      <div className="px-2 py-3">
        <p className="text-[10px] text-muted-foreground">Personal</p>
        <p className="font-heading text-sm font-medium">fin</p>
      </div>
      <nav className="flex flex-col gap-px">
        {items.map((item) => {
          const NavIcon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-2.5 px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground"
            >
              <NavIcon className="size-4" weight={active ? "fill" : "regular"} />
              <span className="flex-1">{item.label}</span>
              {item.wip ? (
                <Code
                  className="size-3.5 text-muted-foreground/60"
                  weight="bold"
                  aria-label="Under development"
                />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** Bottom tab bar on mobile only. */
function BottomBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const isActive = useActive();
  const items = isAdmin ? [...ITEMS, ADMIN_ITEM] : ITEMS;
  return (
    <nav
      className="sticky bottom-0 z-10 grid border-t border-foreground/10 bg-card md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const NavIcon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center gap-1 py-2.5 text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground"
          >
            <span className="relative">
              <NavIcon className="size-5" weight={active ? "fill" : "regular"} />
              {item.wip ? (
                <Code
                  className="absolute -right-2 -top-1 size-3 text-muted-foreground/60"
                  weight="bold"
                  aria-label="Under development"
                />
              ) : null}
            </span>
            <span className="text-[10px] leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export { Sidebar, BottomBar };
