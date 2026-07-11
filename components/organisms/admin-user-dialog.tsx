"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as yup from "yup";
import { toast } from "sonner";
import { Eraser } from "@phosphor-icons/react";

import { Button } from "@/components/atoms/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/atoms/dialog";
import { Form, FormInput, FormSelect } from "@/components/molecules/form";
import { ConfirmPopover } from "@/components/molecules/confirm-popover";
import { resetAccountData, updateUser, type IAdminUser } from "@/handlers/admin";

const ROLES = ["USER", "ADMIN"] as const;
const ROLE_OPTIONS = [
  { value: "USER", label: "User" },
  { value: "ADMIN", label: "Admin" },
];

const schema = yup.object({
  name: yup.string().trim().default(""),
  role: yup.string().oneOf(ROLES).required(),
});

type UserValues = yup.InferType<typeof schema>;

type Props = {
  trigger: React.ReactNode;
  user: IAdminUser;
};

function AdminUserDialog({ trigger, user }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  const defaultValues: UserValues = {
    name: user.name ?? "",
    role: user.role,
  };

  async function onSubmit(values: UserValues) {
    const res = await updateUser(user.id, {
      name: values.name,
      role: values.role,
    });
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("User updated");
    setOpen(false);
    router.refresh();
  }

  const resetTotal =
    user.transactions + user.funds + user.purposes + user.rules;

  async function onReset() {
    setResetting(true);
    const res = await resetAccountData(user.id);
    setResetting(false);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Account data reset");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage user</DialogTitle>
        </DialogHeader>

        <Form
          schema={schema}
          onSubmit={onSubmit}
          defaultValues={defaultValues}
          className="flex flex-col gap-4"
        >
          {({ formState: { isSubmitting } }) => (
            <>
              <FormInput<UserValues>
                name="name"
                label="Name"
                placeholder="No name set"
                autoFocus
              />

              <FormSelect<UserValues>
                name="role"
                label="Role"
                options={ROLE_OPTIONS}
              />

              <div className="flex flex-col gap-1 bg-muted px-3 py-2.5 text-[10px] text-muted-foreground ring-1 ring-foreground/10">
                <p className="truncate">{user.email ?? "no email"}</p>
                <p className="tabular-nums">
                  {user.transactions} transactions · {user.funds} funds ·{" "}
                  {user.purposes} purposes · {user.rules} rules ·{" "}
                  {user.ownedGroups} groups
                </p>
              </div>

              <DialogFooter className="justify-between">
                <ConfirmPopover
                  align="start"
                  message={
                    <>
                      Reset all data for{" "}
                      <span className="font-medium">
                        {user.name ?? user.id}
                      </span>
                      ? {resetTotal} records (transactions, funds, purposes,
                      rules){user.ownedGroups > 0 ? (
                        <> plus {user.ownedGroups} owned group
                        {user.ownedGroups > 1 ? "s" : ""} (pool, group
                        transactions, temp members)</>
                      ) : null}{" "}
                      will be permanently deleted, and they&apos;ll leave any
                      other groups. The account is kept. This cannot be undone.
                    </>
                  }
                  confirmLabel="Reset data"
                  onConfirm={onReset}
                  trigger={
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={resetting}
                    >
                      <Eraser />
                      Reset data
                    </Button>
                  }
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    Save
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

export { AdminUserDialog };
