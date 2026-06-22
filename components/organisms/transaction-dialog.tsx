"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as yup from "yup";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
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
  FormCombobox,
  FormDateTime,
  FormInput,
  FormSegmented,
  FormSelect,
} from "@/components/molecules/form";
import { formatCurrency } from "@/lib/format";
import { createTransaction } from "@/handlers/transactions";
import {
  TransactionType,
  TransactionCategory,
} from "@/lib/generated/prisma/client";

const TYPES = ["OUTCOME", "INCOME", "TRANSFER"] as const;

const TYPE_OPTIONS = TYPES.map((t) => ({
  value: t,
  label: t[0] + t.slice(1).toLowerCase(),
}));
const CATEGORY_OPTIONS = [
  { value: "ESSENTIAL", label: "Essential" },
  { value: "INCIDENTAL", label: "Incidental" },
];

const schema = yup.object({
  type: yup.string().oneOf(TYPES).required(),
  amount: yup
    .number()
    .typeError("Enter an amount")
    .positive("Must be positive")
    .required("Amount is required"),
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
};

function TransactionDialog({
  trigger,
  funds,
  purposes = [],
  mode = "full",
  title,
  defaults,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const noFunds = funds.length === 0;
  const fundOptions = funds.map((f) => ({
    value: f.id,
    label: `${f.name} · ${formatCurrency(f.balance)}`,
  }));
  const defaultValues: TxnValues = {
    type: "OUTCOME",
    amount: defaults?.amount ?? (undefined as unknown as number),
    description: defaults?.description ?? "",
    fundId: funds[0]?.id ?? "",
    toFundId: "",
    category: defaults?.category ?? "ESSENTIAL",
    purpose: defaults?.purpose ?? "",
    at: new Date(),
  };

  async function onSubmit(values: TxnValues) {
    const res = await createTransaction({
      type: values.type as TransactionType,
      amount: values.amount,
      fundId: values.fundId,
      toFundId: values.type === "TRANSFER" ? values.toFundId : null,
      description: values.description,
      category: values.category as TransactionCategory,
      purposeName: values.purpose || null,
      occurredAt: values.at,
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
    <Dialog open={open} onOpenChange={setOpen}>
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
              const fundLabel = isTransfer
                ? "From"
                : isOutcome
                  ? "Pay from"
                  : "Into";

              return (
                <>
                  {mode === "full" ? (
                    <FormSegmented<TxnValues> name="type" options={TYPE_OPTIONS} />
                  ) : null}

                  <FormAmount<TxnValues> name="amount" label="Amount" />

                  <FormInput<TxnValues>
                    name="description"
                    label="Description"
                    placeholder="What for?"
                  />

                  <FormSelect<TxnValues>
                    name="fundId"
                    label={fundLabel}
                    options={fundOptions}
                  />

                  {isTransfer ? (
                    <FormSelect<TxnValues>
                      name="toFundId"
                      label="To"
                      placeholder="Destination"
                      options={fundOptions}
                    />
                  ) : null}

                  {mode === "full" ? (
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
