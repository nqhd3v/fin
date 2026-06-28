"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as yup from "yup";
import { toast } from "sonner";
import { Trash } from "@phosphor-icons/react";

import { Button } from "@/components/atoms/button";
import { ConfirmPopover } from "@/components/molecules/confirm-popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/atoms/dialog";
import {
  Form,
  FormAmount,
  FormInput,
  FormSegmented,
  FormSelect,
} from "@/components/molecules/form";
import { formatCurrency } from "@/lib/format";
import {
  createRule,
  deleteRule,
  updateRule,
} from "@/handlers/recurring";
import type { FundOption } from "@/components/organisms/transaction-dialog";
import {
  TransactionType,
  TransactionCategory,
  RecurrenceAnchor,
} from "@/lib/generated/prisma/client";

const TYPES = ["OUTCOME", "INCOME"] as const;
const ANCHORS = [
  "DAY_OF_MONTH",
  "SECOND_TO_LAST_DAY",
  "LAST_DAY",
  "WEEKLY",
] as const;

const TYPE_OPTIONS = [
  { value: "OUTCOME", label: "Outcome" },
  { value: "INCOME", label: "Income" },
];
const ANCHOR_OPTIONS = [
  { value: "DAY_OF_MONTH", label: "Day of month" },
  { value: "SECOND_TO_LAST_DAY", label: "2nd-to-last day" },
  { value: "LAST_DAY", label: "Last day" },
  { value: "WEEKLY", label: "Weekly" },
];
const CATEGORY_OPTIONS = [
  { value: "ESSENTIAL", label: "Essential" },
  { value: "INCIDENTAL", label: "Incidental" },
];
const WEEKDAY_OPTIONS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
  (d, i) => ({ value: String(i), label: d }),
);

const schema = yup.object({
  name: yup.string().trim().required("Name is required"),
  type: yup.string().oneOf(TYPES).required(),
  amount: yup
    .number()
    .typeError("Enter an amount")
    .positive("Must be positive")
    .required("Amount is required"),
  sourceId: yup.string().required("Select a fund"),
  category: yup.string().default("ESSENTIAL"),
  anchor: yup.string().oneOf(ANCHORS).required(),
  dayValue: yup
    .number()
    .nullable()
    .transform((v, o) => (o === "" || o == null ? null : v))
    .when("anchor", {
      is: (a: string) => a === "DAY_OF_MONTH" || a === "WEEKLY",
      then: (s) => s.typeError("Required").required("Required"),
    }),
});

type RuleValues = yup.InferType<typeof schema>;

export type RecurringDTO = {
  id: string;
  name: string;
  type: (typeof TYPES)[number];
  amount: number;
  sourceId: string | null;
  category: string;
  anchor: (typeof ANCHORS)[number];
  dayValue: number | null;
};

type Props = {
  trigger: React.ReactNode;
  funds: FundOption[];
  rule?: RecurringDTO;
};

function RecurringDialog({ trigger, funds, rule }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const isEdit = Boolean(rule);
  const noFunds = funds.length === 0;

  const fundOptions = funds.map((f) => ({
    value: f.id,
    label: `${f.name} · ${formatCurrency(f.balance)}`,
  }));

  const defaultValues: RuleValues = {
    name: rule?.name ?? "",
    type: rule?.type ?? "OUTCOME",
    amount: rule?.amount ?? (undefined as unknown as number),
    sourceId: rule?.sourceId ?? funds[0]?.id ?? "",
    category: rule?.category && rule.category !== "NULL" ? rule.category : "ESSENTIAL",
    anchor: rule?.anchor ?? "DAY_OF_MONTH",
    dayValue: rule?.dayValue ?? 1,
  };

  async function onSubmit(values: RuleValues) {
    const payload = {
      name: values.name,
      type: values.type as TransactionType,
      amount: values.amount,
      sourceId: values.sourceId,
      category: values.category as TransactionCategory,
      anchor: values.anchor as RecurrenceAnchor,
      dayValue: values.dayValue ?? null,
    };
    const res = isEdit
      ? await updateRule(rule!.id, payload)
      : await createRule(payload);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success(isEdit ? "Rule updated" : "Rule added");
    setOpen(false);
    router.refresh();
  }

  async function onDelete() {
    if (!rule) return;
    setDeleting(true);
    const res = await deleteRule(rule.id);
    setDeleting(false);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Rule deleted");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit recurring" : "Add recurring"}</DialogTitle>
        </DialogHeader>

        {noFunds ? (
          <p className="bg-muted px-3 py-6 text-center text-xs text-muted-foreground ring-1 ring-foreground/10">
            Add a fund first — a rule needs an account.
          </p>
        ) : (
          <Form
            schema={schema}
            onSubmit={onSubmit}
            defaultValues={defaultValues}
            className="flex flex-col gap-4"
          >
            {({ watch, formState: { isSubmitting } }) => {
              const type = watch("type");
              const anchor = watch("anchor");
              const isOutcome = type === "OUTCOME";
              return (
                <>
                  <FormSegmented<RuleValues> name="type" options={TYPE_OPTIONS} />

                  <FormInput<RuleValues>
                    name="name"
                    label="Name"
                    placeholder="e.g. Salary, Home rent"
                    autoFocus
                  />

                  <FormAmount<RuleValues> name="amount" label="Amount" />

                  <FormSelect<RuleValues>
                    name="sourceId"
                    label={isOutcome ? "Pay from" : "Into"}
                    options={fundOptions}
                  />

                  {isOutcome ? (
                    <FormSelect<RuleValues>
                      name="category"
                      label="Category"
                      options={CATEGORY_OPTIONS}
                    />
                  ) : null}

                  <div className="grid grid-cols-2 gap-3">
                    <FormSelect<RuleValues>
                      name="anchor"
                      label="Repeats"
                      options={ANCHOR_OPTIONS}
                      className={
                        anchor === "DAY_OF_MONTH" || anchor === "WEEKLY"
                          ? undefined
                          : "col-span-2"
                      }
                    />
                    {anchor === "DAY_OF_MONTH" ? (
                      <FormInput<RuleValues>
                        name="dayValue"
                        label="Day (1–31)"
                        inputMode="numeric"
                        placeholder="1"
                      />
                    ) : null}
                    {anchor === "WEEKLY" ? (
                      <FormSelect<RuleValues>
                        name="dayValue"
                        label="Weekday"
                        options={WEEKDAY_OPTIONS}
                      />
                    ) : null}
                  </div>

                  <DialogFooter className="justify-between">
                    {isEdit ? (
                      <ConfirmPopover
                        message={`Delete "${rule!.name}"? Past generated entries are kept.`}
                        confirmLabel="Delete"
                        onConfirm={onDelete}
                        trigger={
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={deleting}
                          >
                            <Trash />
                            Delete
                          </Button>
                        }
                      />
                    ) : (
                      <span />
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isEdit ? "Save" : "Add"}
                      </Button>
                    </div>
                  </DialogFooter>
                </>
              );
            }}
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { RecurringDialog };
