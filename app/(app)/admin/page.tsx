import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/auth";
import { listUsers, listGroupsAdmin } from "@/handlers/admin";
import { AdminUsersTable } from "@/components/organisms/admin-users-table";
import { AdminGroupsTable } from "@/components/organisms/admin-groups-table";

export default async function AdminPage() {
  // Page-level gate: non-admins never see this view.
  if (!(await isAdmin())) redirect("/");

  const [users, groups] = await Promise.all([listUsers(), listGroupsAdmin()]);

  return (
    <>
      <header className="flex items-center border-b border-foreground/10 px-4 py-3">
        <h1 className="font-heading text-sm font-medium">Admin</h1>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <section className="flex flex-col gap-3 bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xs font-medium">Users</h2>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {users.length} total
            </span>
          </div>
          <AdminUsersTable users={users} />
        </section>

        <section className="flex flex-col gap-3 bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xs font-medium">Groups</h2>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {groups.length} total
            </span>
          </div>
          <AdminGroupsTable groups={groups} />
        </section>
      </div>
    </>
  );
}
