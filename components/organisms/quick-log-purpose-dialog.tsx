"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";
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
import { Label } from "@/components/atoms/label";
import {
  Form,
  FormAmount,
  FormInput,
  FormSelect,
} from "@/components/molecules/form";
import { IconPicker } from "@/components/molecules/icon-picker";
import { QUICK_ICON_NAMES } from "@/lib/quick-icons";
import {
  createPurpose,
  deletePurpose,
  updatePurpose,
  type QuickLogPurpose,
} from "@/handlers/purposes";
import { TransactionCategory } from "@/lib/generated/prisma/client";

const CATEGORIES = ["ESSENTIAL", "INCIDENTAL", "NULL"] as const;
const CATEGORY_OPTIONS = [
  { value: "ESSENTIAL", label: "Essential" },
  { value: "INCIDENTAL", label: "Incidental" },
  { value: "NULL", label: "None" },
];

const schema = yup.object({
  name: yup.string().trim().required("Name is required"),
  icon: yup.string().oneOf(QUICK_ICON_NAMES, "Pick an icon").required("Pick an icon"),
  defaultAmount: yup
    .number()
    .nullable()
    .transform((v, o) => (o === "" || o == null ? null : v))
    .min(0, "Cannot be negative"),
  category: yup.string().oneOf(CATEGORIES).required(),
});

type PurposeValues = yup.InferType<typeof schema>;

type Props = {
  trigger: React.ReactNode;
  purpose?: QuickLogPurpose;
};

function QuickLogPurposeDialog({ trigger, purpose }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const isEdit = Boolean(purpose);

  const defaultValues: PurposeValues = {
    name: purpose?.name ?? "",
    icon: purpose?.icon ?? QUICK_ICON_NAMES[0],
    defaultAmount: purpose?.defaultAmount ?? null,
    category: (purpose?.category ?? "NULL") as PurposeValues["category"],
  };

  async function onSubmit(values: PurposeValues) {
    const payload = {
      name: values.name,
      icon: values.icon,
      defaultAmount: values.defaultAmount ?? null,
      category: values.category as TransactionCategory,
    };
    const res = isEdit
      ? await updatePurpose(purpose!.id, payload)
      : await createPurpose(payload);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success(isEdit ? "Action updated" : "Action added");
    setOpen(false);
    router.refresh();
  }

  async function onDelete() {
    if (!purpose) return;
    setDeleting(true);
    const res = await deletePurpose(purpose.id);
    setDeleting(false);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Action removed");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit action" : "New action"}</DialogTitle>
        </DialogHeader>

        <Form
          schema={schema}
          onSubmit={onSubmit}
          defaultValues={defaultValues}
          className="flex flex-col gap-4"
        >
          {({ control, formState: { isSubmitting, errors } }) => (
            <>
              <FormInput<PurposeValues>
                name="name"
                label="Label"
                placeholder="e.g. Coffee"
                autoFocus
              />

              <div className="flex flex-col gap-1.5">
                <Label>Icon</Label>
                <Controller
                  control={control}
                  name="icon"
                  render={({ field }) => (
                    <IconPicker value={field.value} onChange={field.onChange} />
                  )}
                />
                {errors.icon ? (
                  <p className="text-xs text-destructive">
                    {errors.icon.message as string}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormAmount<PurposeValues>
                  name="defaultAmount"
                  label="Default amount"
                />
                <FormSelect<PurposeValues>
                  name="category"
                  label="Category"
                  options={CATEGORY_OPTIONS}
                />
              </div>

              <DialogFooter className="justify-between">
                {isEdit ? (
                  <ConfirmPopover
                    message={`Remove "${purpose!.name}" from quick log?`}
                    confirmLabel="Remove"
                    onConfirm={onDelete}
                    trigger={
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={deleting}
                      >
                        <Trash />
                        Remove
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

export { QuickLogPurposeDialog };
