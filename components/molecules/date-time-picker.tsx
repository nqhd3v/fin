"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarBlank } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/atoms/button";
import { Calendar } from "@/components/atoms/calendar";
import { Input } from "@/components/atoms/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/atoms/popover";

type Props = {
  value?: Date;
  onChange: (date: Date) => void;
  id?: string;
};

/** shadcn Calendar (date) + native time input, combined into one Date value. */
function DateTimePicker({ value, onChange, id }: Props) {
  const [open, setOpen] = React.useState(false);
  const date = value ?? new Date();
  const timeValue = format(date, "HH:mm");

  function setDatePart(next?: Date) {
    if (!next) return;
    const merged = new Date(next);
    merged.setHours(date.getHours(), date.getMinutes(), 0, 0);
    onChange(merged);
    setOpen(false);
  }

  function setTimePart(time: string) {
    const [h, m] = time.split(":").map(Number);
    const merged = new Date(date);
    merged.setHours(h || 0, m || 0, 0, 0);
    onChange(merged);
  }

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn("h-8 flex-1 justify-start font-normal", !value && "text-muted-foreground")}
          >
            <CalendarBlank />
            {value ? format(value, "EEE d MMM yyyy") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={setDatePart} autoFocus />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        aria-label="Time"
        value={timeValue}
        onChange={(e) => setTimePart(e.target.value)}
        className="w-24"
      />
    </div>
  );
}

export { DateTimePicker };
