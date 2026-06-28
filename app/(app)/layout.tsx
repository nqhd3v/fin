import { BottomBar, Sidebar } from "@/components/organisms/app-nav";
import { isAdmin } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();
  return (
    <div className="flex min-h-full w-full flex-1">
      <Sidebar isAdmin={admin} />
      <div className="flex min-w-0 flex-1 flex-col">
        {children}
        <BottomBar isAdmin={admin} />
      </div>
    </div>
  );
}
