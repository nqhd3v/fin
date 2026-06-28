"use client";

import * as React from "react";
import { Gear, UserCircle, MagnifyingGlass } from "@phosphor-icons/react";

import { Badge } from "@/components/atoms/badge";
import { Input } from "@/components/atoms/input";
import { AdminUserDialog } from "@/components/organisms/admin-user-dialog";
import type { IAdminUser } from "@/handlers/admin";

function AdminUsersTable({ users }: { users: IAdminUser[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q),
    );
  }, [users, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name or email…"
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="bg-card px-3 py-6 text-center text-xs text-muted-foreground ring-1 ring-foreground/10">
          {users.length === 0 ? "No users yet." : "No users match your filter."}
        </p>
      ) : (
        <div className="flex flex-col gap-px bg-border ring-1 ring-foreground/10">
          {filtered.map((u) => (
            <AdminUserDialog
              key={u.id}
              user={u}
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-3 bg-card px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <UserCircle
                    className="size-5 shrink-0 text-muted-foreground"
                    weight="duotone"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs">
                      {u.name ?? "Unnamed"}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {u.email ?? "no email"}
                    </span>
                  </span>
                  {u.role === "ADMIN" ? (
                    <Badge variant="default">Admin</Badge>
                  ) : (
                    <Badge variant="outline">User</Badge>
                  )}
                  <Gear className="size-4 shrink-0 text-muted-foreground" />
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export { AdminUsersTable };
