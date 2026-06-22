"use client";

import * as React from "react";
import { CaretUpDown, Check, Plus } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/atoms/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/atoms/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/atoms/popover";

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  /** show a "Create '<query>'" row for values not in the list */
  allowCreate?: boolean;
  id?: string;
  onBlur?: () => void;
};

/** Searchable select that can also create a new value inline. */
function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  allowCreate = true,
  id,
  onBlur,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const q = query.trim();
  const filtered = options.filter((o) =>
    o.toLowerCase().includes(q.toLowerCase()),
  );
  const exact = options.some((o) => o.toLowerCase() === q.toLowerCase());

  function pick(next: string) {
    onChange(next);
    setQuery("");
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) onBlur?.();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-8 w-full justify-between font-normal",
            !value && "text-muted-foreground",
          )}
        >
          {value || placeholder}
          <CaretUpDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filtered.length === 0 && !(allowCreate && q) ? (
              <CommandEmpty>Nothing found.</CommandEmpty>
            ) : null}
            <CommandGroup>
              {filtered.map((o) => (
                <CommandItem key={o} value={o} onSelect={() => pick(o)}>
                  <Check
                    className={cn(
                      "size-4",
                      value === o ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {o}
                </CommandItem>
              ))}
              {allowCreate && q && !exact ? (
                <CommandItem value={`__create__${q}`} onSelect={() => pick(q)}>
                  <Plus className="size-4" />
                  Create “{q}”
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { Combobox };
