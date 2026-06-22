"use client";

import { cn } from "@/lib/utils";
import { QUICK_ICON_NAMES, QUICK_ICONS } from "@/lib/quick-icons";

type Props = {
  value: string;
  onChange: (name: string) => void;
};

/** Grid of curated quick-log icons; stores the selected icon key. */
function IconPicker({ value, onChange }: Props) {
  return (
    <div className="grid max-h-40 grid-cols-7 gap-px overflow-y-auto bg-border ring-1 ring-foreground/10 sm:grid-cols-8">
      {QUICK_ICON_NAMES.map((name) => {
        const PickIcon = QUICK_ICONS[name];
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(name)}
            className={cn(
              "flex aspect-square items-center justify-center bg-card transition-colors outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring",
              selected && "bg-primary text-primary-foreground hover:bg-primary",
            )}
          >
            <PickIcon className="size-4" weight={selected ? "fill" : "duotone"} />
          </button>
        );
      })}
    </div>
  );
}

export { IconPicker };
