"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Client wrapper so the server RootLayout can mount next-themes. */
function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export { ThemeProvider };
