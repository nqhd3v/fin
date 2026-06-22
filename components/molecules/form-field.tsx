import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/atoms/input"
import { Label } from "@/components/atoms/label"

function FormField({
  id,
  label,
  error,
  className,
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string
  error?: string
}) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div
      className="group/field flex flex-col gap-1.5"
      data-disabled={props.disabled || undefined}
    >
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(className)}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { FormField }
