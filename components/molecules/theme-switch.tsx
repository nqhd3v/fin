"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Desktop, Sun, Moon, type Icon } from "@phosphor-icons/react";

const OPTIONS: { value: string; label: string; icon: Icon }[] = [
  { value: "system", label: "System", icon: Desktop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/** Segmented System / Light / Dark selector backed by next-themes. */
function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  // Theme is only known client-side (localStorage); avoid a hydration
  // mismatch by not marking any option active until mounted.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <div className="grid grid-cols-3 gap-px bg-border ring-1 ring-foreground/10">
      {OPTIONS.map((o) => {
        const OptionIcon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={mounted && theme === o.value}
            onClick={() => setTheme(o.value)}
            className="flex items-center justify-center gap-1.5 bg-card py-2 text-[11px] transition-colors hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            <OptionIcon className="size-3.5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export { ThemeSwitch };
