"use client";

import * as React from "react";
import { Gear, UsersThree, MagnifyingGlass, Prohibit } from "@phosphor-icons/react";

import { Badge } from "@/components/atoms/badge";
import { Input } from "@/components/atoms/input";
import { AdminGroupDialog } from "@/components/organisms/admin-group-dialog";
import type { IAdminGroup } from "@/handlers/admin";

function AdminGroupsTable({ groups }: { groups: IAdminGroup[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.ownerName ?? "").toLowerCase().includes(q) ||
        (g.ownerEmail ?? "").toLowerCase().includes(q),
    );
  }, [groups, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by group or owner…"
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="bg-card px-3 py-6 text-center text-xs text-muted-foreground ring-1 ring-foreground/10">
          {groups.length === 0 ? "No groups yet." : "No groups match your filter."}
        </p>
      ) : (
        <div className="flex flex-col gap-px bg-border ring-1 ring-foreground/10">
          {filtered.map((g) => (
            <AdminGroupDialog
              key={g.id}
              group={g}
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-3 bg-card px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <UsersThree
                    className="size-5 shrink-0 text-muted-foreground"
                    weight="duotone"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs">{g.name}</span>
                    <span className="block truncate text-[10px] text-muted-foreground tabular-nums">
                      {g.ownerName ?? g.ownerEmail ?? "?"} · {g.members} members ·{" "}
                      {g.transactions} txns
                    </span>
                  </span>
                  {g.blockedReason ? (
                    <Badge variant="destructive">
                      <Prohibit />
                      Blocked
                    </Badge>
                  ) : null}
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

export { AdminGroupsTable };
