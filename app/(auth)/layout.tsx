export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-screen w-full items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm">{children}</div>
    </section>
  );
}
