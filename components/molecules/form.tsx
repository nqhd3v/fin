"use client"

import * as React from "react"
import {
  useForm,
  FormProvider,
  useFormContext,
  Controller,
  type SubmitHandler,
  type FieldValues,
  type DefaultValues,
  type Resolver,
  type UseFormReturn,
  type Path,
} from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import type { ObjectSchema } from "yup"

import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/format"
import { FormField } from "@/components/molecules/form-field"
import { Input } from "@/components/atoms/input"
import { Label } from "@/components/atoms/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Combobox } from "@/components/molecules/combobox"
import { DateTimePicker } from "@/components/molecules/date-time-picker"

type FormProps<T extends FieldValues> = Omit<
  React.ComponentProps<"form">,
  "onSubmit" | "children"
> & {
  schema: ObjectSchema<T>
  onSubmit: SubmitHandler<T>
  defaultValues?: DefaultValues<T>
  children:
    | React.ReactNode
    | ((methods: UseFormReturn<T>) => React.ReactNode)
}

/**
 * Generic react-hook-form wrapper using a yup schema as resolver.
 * Provides form context to descendant `FormInput` fields.
 */
function Form<T extends FieldValues>({
  schema,
  onSubmit,
  defaultValues,
  children,
  ...props
}: FormProps<T>) {
  const methods = useForm<T>({
    resolver: yupResolver(schema) as Resolver<T>,
    defaultValues,
    mode: "onBlur",
  })

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} {...props}>
        {typeof children === "function" ? children(methods) : children}
      </form>
    </FormProvider>
  )
}

type FormInputProps<T extends FieldValues> = Omit<
  React.ComponentProps<typeof FormField>,
  "name" | "error"
> & {
  name: Path<T>
}

/**
 * Field bound to the surrounding `Form` context. Registers itself with
 * react-hook-form and surfaces the matching yup validation error.
 */
function FormInput<T extends FieldValues = FieldValues>({
  name,
  ...props
}: FormInputProps<T>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>()

  const error = errors[name]?.message as string | undefined

  return <FormField error={error} {...props} {...register(name)} />
}

type FieldShellProps = {
  label: string
  htmlFor?: string
  error?: string
  className?: string
  children: React.ReactNode
}

/** Label + control + error, shared by the Controller-bound fields below. */
function FieldShell({ label, htmlFor, error, className, children }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

type Option = { value: string; label: string }

type FormSelectProps<T extends FieldValues> = {
  name: Path<T>
  label: string
  options: Option[]
  placeholder?: string
  className?: string
}

/** Select bound to the surrounding `Form` via react-hook-form Controller. */
function FormSelect<T extends FieldValues = FieldValues>({
  name,
  label,
  options,
  placeholder,
  className,
}: FormSelectProps<T>) {
  const { control } = useFormContext<T>()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell label={label} error={fieldState.error?.message} className={className}>
          <Select value={field.value ?? ""} onValueChange={field.onChange}>
            <SelectTrigger className="w-full" onBlur={field.onBlur}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
      )}
    />
  )
}

type FormDateTimeProps<T extends FieldValues> = {
  name: Path<T>
  label: string
  className?: string
}

/** Date-time picker bound to the surrounding `Form` via Controller. */
function FormDateTime<T extends FieldValues = FieldValues>({
  name,
  label,
  className,
}: FormDateTimeProps<T>) {
  const { control } = useFormContext<T>()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell label={label} error={fieldState.error?.message} className={className}>
          <DateTimePicker value={field.value} onChange={field.onChange} />
        </FieldShell>
      )}
    />
  )
}

type FormAmountProps<T extends FieldValues> = {
  name: Path<T>
  label: string
  placeholder?: string
  className?: string
  inputClassName?: string
}

/**
 * Numeric field that displays grouped thousands as you type ("20000" ->
 * "20.000") while storing a plain number in the form. Bound via Controller.
 */
function FormAmount<T extends FieldValues = FieldValues>({
  name,
  label,
  placeholder = "0",
  className,
  inputClassName,
}: FormAmountProps<T>) {
  const { control } = useFormContext<T>()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const num = typeof field.value === "number" ? field.value : NaN
        const display = Number.isFinite(num) ? formatNumber(num) : ""
        return (
          <FieldShell label={label} error={fieldState.error?.message} className={className}>
            <Input
              inputMode="numeric"
              placeholder={placeholder}
              value={display}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "")
                field.onChange(digits ? Number(digits) : undefined)
              }}
              onBlur={field.onBlur}
              className={inputClassName}
            />
          </FieldShell>
        )
      }}
    />
  )
}

type FormComboboxProps<T extends FieldValues> = {
  name: Path<T>
  label: string
  options: string[]
  placeholder?: string
  allowCreate?: boolean
  className?: string
}

/** Searchable + creatable combobox bound to the surrounding `Form`. */
function FormCombobox<T extends FieldValues = FieldValues>({
  name,
  label,
  options,
  placeholder,
  allowCreate = true,
  className,
}: FormComboboxProps<T>) {
  const { control } = useFormContext<T>()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell label={label} error={fieldState.error?.message} className={className}>
          <Combobox
            value={field.value ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            options={options}
            placeholder={placeholder}
            allowCreate={allowCreate}
          />
        </FieldShell>
      )}
    />
  )
}

type FormSegmentedProps<T extends FieldValues> = {
  name: Path<T>
  options: Option[]
}

/** Segmented button group bound to the surrounding `Form` via Controller. */
function FormSegmented<T extends FieldValues = FieldValues>({
  name,
  options,
}: FormSegmentedProps<T>) {
  const { control } = useFormContext<T>()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div
          className="grid gap-px bg-border ring-1 ring-foreground/10"
          style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={field.value === o.value}
              onClick={() => field.onChange(o.value)}
              className="bg-card py-2 text-[11px] transition-colors hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    />
  )
}

type FormCheckboxGroupProps<T extends FieldValues> = {
  name: Path<T>
  label: string
  options: Option[]
  className?: string
}

/**
 * Multi-select toggle chips bound to the form. Value is a string[] of the
 * selected option values. Tap a chip to add/remove.
 */
function FormCheckboxGroup<T extends FieldValues = FieldValues>({
  name,
  label,
  options,
  className,
}: FormCheckboxGroupProps<T>) {
  const { control } = useFormContext<T>()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value: string[] = Array.isArray(field.value) ? field.value : []
        const toggle = (v: string) =>
          field.onChange(
            value.includes(v) ? value.filter((x) => x !== v) : [...value, v],
          )
        const allSelected = options.length > 0 && value.length === options.length
        return (
          <FieldShell
            label={label}
            error={fieldState.error?.message}
            className={className}
          >
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-pressed={allSelected}
                onClick={() =>
                  field.onChange(allSelected ? [] : options.map((o) => o.value))
                }
                className="border border-input px-2 py-1 text-[11px] transition-colors hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary"
              >
                All
              </button>
              {options.map((o) => {
                const on = value.includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(o.value)}
                    className="border border-input px-2 py-1 text-[11px] transition-colors hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary"
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </FieldShell>
        )
      }}
    />
  )
}

export {
  Form,
  FormInput,
  FormSelect,
  FormAmount,
  FormCombobox,
  FormDateTime,
  FormSegmented,
  FormCheckboxGroup,
  useFormContext,
}
