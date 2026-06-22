import { BottomBar, Sidebar } from "@/components/organisms/app-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full w-full flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {children}
        <BottomBar />
      </div>
    </div>
  );
}
