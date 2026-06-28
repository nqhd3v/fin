"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as yup from "yup";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
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
  FormCheckboxGroup,
  FormCombobox,
  FormDateTime,
  FormInput,
  FormSegmented,
  FormSelect,
} from "@/components/molecules/form";
import { formatCurrency, formatNumber } from "@/lib/format";
import { createTransaction } from "@/handlers/transactions";
import { createReimbursement } from "@/handlers/groups";
import {
  TransactionType,
  TransactionCategory,
} from "@/lib/generated/prisma/client";

const TYPES = ["OUTCOME", "INCOME", "TRANSFER"] as const;

// Sentinel for the "External / store" pay-to option (Radix Select can't use "").
const EXTERNAL = "external";

const TYPE_OPTIONS = TYPES.map((t) => ({
  value: t,
  label: t[0] + t.slice(1).toLowerCase(),
}));
// Group pool: no personal funds, no transfers — just spend or contribute.
const GROUP_TYPE_OPTIONS = [
  { value: "OUTCOME", label: "Spend" },
  { value: "INCOME", label: "Contribute" },
];
const CATEGORY_OPTIONS = [
  { value: "ESSENTIAL", label: "Essential" },
  { value: "INCIDENTAL", label: "Incidental" },
];

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const schema = yup.object({
  type: yup.string().oneOf(TYPES).required(),
  // Group spend split mode — "custom" means the amount is computed from the
  // per-member table, so the single Amount field isn't required.
  splitMode: yup.string().oneOf(["equal", "custom"]).default("equal"),
  amount: yup
    .number()
    .typeError("Enter an amount")
    .when(["type", "splitMode"], {
      is: (type: string, splitMode: string) =>
        type === "OUTCOME" && splitMode === "custom",
      then: (s) => s.notRequired(),
      otherwise: (s) =>
        s.positive("Must be positive").required("Amount is required"),
    }),
  description: yup.string().default(""),
  fundId: yup.string().required("Select a fund"),
  toFundId: yup
    .string()
    .default("")
    .when("type", {
      is: "TRANSFER",
      then: (s) => s.required("Select a destination"),
    }),
  category: yup.string().default("ESSENTIAL"),
  purpose: yup.string().default(""),
  // Group spend destination: "" = external/store, otherwise a member id
  // (reimbursement from the pool).
  payeeId: yup.string().default(EXTERNAL),
  // Group external spend: member ids who used the money (default all).
  participantIds: yup.array().of(yup.string().required()).default([]),
  at: yup.date().required(),
});

type TxnValues = yup.InferType<typeof schema>;

export type FundOption = { id: string; name: string; balance: number };

type Defaults = {
  amount?: number;
  description?: string;
  purpose?: string;
  category?: string;
};

type Props = {
  trigger: React.ReactNode;
  funds: FundOption[];
  purposes?: string[];
  /** quick = outcome only, no type/category/purpose/date. full = everything. */
  mode?: "quick" | "full";
  title?: string;
  defaults?: Defaults;
  /** when set, the transaction is logged into this shared group */
  groupId?: string;
  /** when set, group mode: use this shared pool fund, hide fund pickers */
  groupFund?: FundOption;
  /** group members, enabling "pay to a member" (reimbursement) on spends */
  groupMembers?: { id: string; name: string | null }[];
};

function TransactionDialog({
  trigger,
  funds,
  purposes = [],
  mode = "full",
  title,
  defaults,
  groupId,
  groupFund,
  groupMembers = [],
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  // Custom per-member split (group external spend). Kept in local state since
  // the member rows are dynamic; only `splitMode` lives in the form (to gate
  // amount validation). Reset whenever the dialog closes.
  const [custom, setCustom] = React.useState<Record<string, string>>({});
  const [vat, setVat] = React.useState("");
  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setCustom({});
      setVat("");
    }
  }

  // base per member + VAT split evenly across members who have an amount.
  const baseRows = groupMembers
    .map((m) => ({ id: m.id, name: m.name, base: num(custom[m.id] ?? "") }))
    .filter((r) => r.base > 0);
  const baseSum = baseRows.reduce((a, r) => a + r.base, 0);
  const vatNum = num(vat);
  const vatEach = baseRows.length > 0 ? vatNum / baseRows.length : 0;
  const customTotal = Math.round(baseSum + vatNum);
  const customShares = baseRows.map((r) => ({
    profileId: r.id,
    amount: Math.round(r.base + vatEach),
  }));
  if (customShares.length > 0) {
    const drift =
      customTotal - customShares.reduce((a, s) => a + s.amount, 0);
    customShares[0].amount += drift;
  }

  const isGroup = Boolean(groupFund);
  const fundList = isGroup ? [groupFund!] : funds;
  const noFunds = fundList.length === 0;
  const fundOptions = fundList.map((f) => ({
    value: f.id,
    label: `${f.name} · ${formatCurrency(f.balance)}`,
  }));
  const typeOptions = isGroup ? GROUP_TYPE_OPTIONS : TYPE_OPTIONS;
  // "Pay to" options on group spends: external/store, or reimburse a member.
  // Radix Select forbids an empty-string value, so external uses a sentinel.
  const payeeOptions = [
    { value: EXTERNAL, label: "External / store" },
    ...groupMembers.map((m) => ({
      value: m.id,
      label: m.name ?? "Unnamed member",
    })),
  ];
  const canReimburse = isGroup && groupMembers.length > 0 && mode === "full";
  const defaultValues: TxnValues = {
    type: "OUTCOME",
    splitMode: "equal",
    amount: defaults?.amount ?? (undefined as unknown as number),
    description: defaults?.description ?? "",
    fundId: fundList[0]?.id ?? "",
    toFundId: "",
    category: defaults?.category ?? "ESSENTIAL",
    purpose: defaults?.purpose ?? "",
    payeeId: EXTERNAL,
    // Default: everyone used it.
    participantIds: groupMembers.map((m) => m.id),
    at: new Date(),
  };

  async function onSubmit(values: TxnValues) {
    const isMemberPayee = Boolean(values.payeeId) && values.payeeId !== EXTERNAL;
    // Group spend to a member → pending reimbursement, not a direct entry.
    if (isGroup && groupId && values.type === "OUTCOME" && isMemberPayee) {
      const res = await createReimbursement({
        groupId,
        payeeId: values.payeeId,
        amount: values.amount ?? 0,
        description: values.description,
      });
      if (!res.ok) {
        toast.warning(res.errorMessage);
        return;
      }
      toast.success("Reimbursement sent for approval");
      setOpen(false);
      router.refresh();
      return;
    }

    // Group external spend with custom per-member amounts.
    const isGroupOutcome = isGroup && values.type === "OUTCOME";
    const useCustom =
      isGroupOutcome && !isMemberPayee && values.splitMode === "custom";
    if (useCustom && customShares.length === 0) {
      toast.warning("Enter at least one member's amount");
      return;
    }

    const res = await createTransaction({
      type: values.type as TransactionType,
      amount: useCustom ? customTotal : values.amount ?? 0,
      fundId: values.fundId,
      toFundId: values.type === "TRANSFER" ? values.toFundId : null,
      description: values.description,
      category: values.category as TransactionCategory,
      purposeName: values.purpose || null,
      occurredAt: values.at,
      groupId: groupId ?? null,
      participantIds:
        isGroupOutcome && !isMemberPayee && !useCustom
          ? (values.participantIds as string[])
          : undefined,
      splits: useCustom ? customShares : undefined,
    });
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Transaction saved");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title ?? (mode === "quick" ? "Quick log" : "New transaction")}
          </DialogTitle>
        </DialogHeader>

        {noFunds ? (
          <p className="bg-muted px-3 py-6 text-center text-xs text-muted-foreground ring-1 ring-foreground/10">
            Add a fund first — every transaction needs an account.
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
              const isOutcome = type === "OUTCOME";
              const isTransfer = type === "TRANSFER";
              const payeeId = watch("payeeId");
              const isReimburse =
                isGroup && isOutcome && Boolean(payeeId) && payeeId !== EXTERNAL;
              // Custom per-member split only for a group spend to external/store.
              const canSplit =
                isGroup && isOutcome && !isReimburse && groupMembers.length > 0;
              const isCustom = canSplit && watch("splitMode") === "custom";
              const fundLabel = isTransfer
                ? "From"
                : isOutcome
                  ? "Pay from"
                  : "Into";

              return (
                <>
                  {mode === "full" ? (
                    <FormSegmented<TxnValues> name="type" options={typeOptions} />
                  ) : null}

                  {!isCustom ? (
                    <FormAmount<TxnValues> name="amount" label="Amount" />
                  ) : null}

                  <FormInput<TxnValues>
                    name="description"
                    label="Description"
                    placeholder="What for?"
                  />

                  {canReimburse && isOutcome ? (
                    <FormSelect<TxnValues>
                      name="payeeId"
                      label="Pay to"
                      options={payeeOptions}
                    />
                  ) : null}

                  {isGroup ? (
                    <p className="bg-muted px-3 py-2 text-[10px] text-muted-foreground ring-1 ring-foreground/10">
                      {isReimburse ? (
                        <>
                          Reimburse from{" "}
                          <span className="text-foreground">{groupFund!.name}</span>{" "}
                          — sent to the member to accept and choose their fund.
                        </>
                      ) : (
                        <>
                          {isOutcome ? "Spent from" : "Added to"} the group pool:{" "}
                          <span className="text-foreground">{groupFund!.name}</span>
                        </>
                      )}
                    </p>
                  ) : (
                    <FormSelect<TxnValues>
                      name="fundId"
                      label={fundLabel}
                      options={fundOptions}
                    />
                  )}

                  {canSplit ? (
                    <div className="flex flex-col gap-3">
                      <FormSegmented<TxnValues>
                        name="splitMode"
                        options={[
                          { value: "equal", label: "Even split" },
                          { value: "custom", label: "Custom amounts" },
                        ]}
                      />

                      {!isCustom ? (
                        <div className="flex flex-col gap-1.5">
                          <FormCheckboxGroup<TxnValues>
                            name="participantIds"
                            label="Used by"
                            options={groupMembers.map((m) => ({
                              value: m.id,
                              label: m.name ?? "Unnamed",
                            }))}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Splits the spend evenly across the selected members.
                            None selected = everyone.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <Label>Amount per member</Label>
                          <div className="flex flex-col gap-px bg-border ring-1 ring-foreground/10">
                            {groupMembers.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center gap-2 bg-card px-3 py-1.5"
                              >
                                <span className="min-w-0 flex-1 truncate text-xs">
                                  {m.name ?? "Unnamed"}
                                </span>
                                <Input
                                  inputMode="numeric"
                                  value={
                                    custom[m.id]
                                      ? formatNumber(Number(custom[m.id]))
                                      : ""
                                  }
                                  onChange={(e) =>
                                    setCustom((p) => ({
                                      ...p,
                                      [m.id]: e.target.value.replace(/\D/g, ""),
                                    }))
                                  }
                                  placeholder="0"
                                  className="h-7 w-28 text-right text-xs"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="td-vat">
                              Extra — VAT / fee (optional)
                            </Label>
                            <Input
                              id="td-vat"
                              inputMode="numeric"
                              value={vat ? formatNumber(Number(vat)) : ""}
                              onChange={(e) =>
                                setVat(e.target.value.replace(/\D/g, ""))
                              }
                              placeholder="0"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Added on top, split evenly across members with an
                              amount.
                            </p>
                          </div>

                          <div className="flex items-center justify-between bg-muted px-3 py-2 text-xs ring-1 ring-foreground/10">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-medium tabular-nums">
                              {formatCurrency(customTotal)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {isTransfer ? (
                    <FormSelect<TxnValues>
                      name="toFundId"
                      label="To"
                      placeholder="Destination"
                      options={fundOptions}
                    />
                  ) : null}

                  {/* Group contribute is a quick pool top-up — no purpose/date. */}
                  {mode === "full" && !(isGroup && type === "INCOME") ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {isOutcome ? (
                          <FormSelect<TxnValues>
                            name="category"
                            label="Category"
                            options={CATEGORY_OPTIONS}
                          />
                        ) : null}
                        <FormCombobox<TxnValues>
                          name="purpose"
                          label="Purpose"
                          placeholder="None or type new"
                          options={purposes}
                          className={isOutcome ? undefined : "col-span-2"}
                        />
                      </div>
                      <FormDateTime<TxnValues> name="at" label="When" />
                    </>
                  ) : null}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      Save
                    </Button>
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

export { TransactionDialog };
