"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as yup from "yup";
import { toast } from "sonner";
import { Trash } from "@phosphor-icons/react";

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
  FormInput,
  FormSegmented,
} from "@/components/molecules/form";
import { ConfirmPopover } from "@/components/molecules/confirm-popover";
import { createFund, deleteFund, updateFund } from "@/handlers/funds";

const TYPES = ["BANK", "EWALLET", "CASH"] as const;
const TYPE_OPTIONS = [
  { value: "BANK", label: "Bank" },
  { value: "EWALLET", label: "E-wallet" },
  { value: "CASH", label: "Cash" },
];

const schema = yup.object({
  name: yup.string().trim().required("Name is required"),
  type: yup.string().oneOf(TYPES).required(),
  balance: yup
    .number()
    .typeError("Enter a balance")
    .min(0, "Cannot be negative")
    .required("Balance is required"),
  hint: yup.string().default(""),
});

type FundValues = yup.InferType<typeof schema>;

export type FundDTO = {
  id: string;
  name: string;
  type: (typeof TYPES)[number];
  balance: number;
  hint: string | null;
};

type Props = {
  trigger: React.ReactNode;
  fund?: FundDTO;
};

function FundDialog({ trigger, fund }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const isEdit = Boolean(fund);

  const defaultValues: FundValues = {
    name: fund?.name ?? "",
    type: fund?.type ?? "BANK",
    balance: fund?.balance ?? 0,
    hint: fund?.hint ?? "",
  };

  async function onSubmit(values: FundValues) {
    const payload = {
      name: values.name,
      type: values.type,
      balance: values.balance,
      hint: values.hint,
    };
    const res = isEdit
      ? await updateFund(fund!.id, payload)
      : await createFund(payload);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success(isEdit ? "Fund updated" : "Fund added");
    setOpen(false);
    router.refresh();
  }

  async function onDelete() {
    if (!fund) return;
    setDeleting(true);
    const res = await deleteFund(fund.id);
    setDeleting(false);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Fund deleted");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit fund" : "Add fund"}</DialogTitle>
        </DialogHeader>

        <Form
          schema={schema}
          onSubmit={onSubmit}
          defaultValues={defaultValues}
          className="flex flex-col gap-4"
        >
          {({ formState: { isSubmitting } }) => (
            <>
              <FormSegmented<FundValues> name="type" options={TYPE_OPTIONS} />

              <FormInput<FundValues>
                name="name"
                label="Name"
                placeholder="e.g. Salary account"
                autoFocus
              />

              <FormAmount<FundValues>
                name="balance"
                label="Current balance"
              />

              <FormInput<FundValues>
                name="hint"
                label="Hint (optional)"
                placeholder="•• 4821"
              />

              <DialogFooter className="justify-between">
                {isEdit ? (
                  <ConfirmPopover
                    message={`Delete "${fund!.name}"? This cannot be undone.`}
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
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { FundDialog };
