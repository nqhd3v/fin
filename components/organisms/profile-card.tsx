"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as yup from "yup";
import { toast } from "sonner";
import { Eraser } from "@phosphor-icons/react";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Form, FormInput } from "@/components/molecules/form";
import { ConfirmPopover } from "@/components/molecules/confirm-popover";
import { ThemeSwitch } from "@/components/molecules/theme-switch";
import { resetMyData, updateMyName, type IMyProfile } from "@/handlers/profile";

const schema = yup.object({
  name: yup.string().trim().default(""),
});

type Values = yup.InferType<typeof schema>;

function ProfileCard({ profile }: { profile: IMyProfile }) {
  const router = useRouter();
  const [resetting, setResetting] = React.useState(false);

  async function onSubmit(values: Values) {
    const res = await updateMyName(values.name);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Profile updated");
    router.refresh();
  }

  async function onReset() {
    setResetting(true);
    const res = await resetMyData();
    setResetting(false);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Personal data reset");
    router.refresh();
  }

  const { counts } = profile;
  const resetTotal =
    counts.transactions + counts.funds + counts.purposes + counts.rules;

  const stats = [
    { label: "Transactions", value: counts.transactions },
    { label: "Funds", value: counts.funds },
    { label: "Purposes", value: counts.purposes },
    { label: "Rules", value: counts.rules },
    { label: "Groups owned", value: counts.groups },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Account */}
      <section className="flex flex-col gap-4 bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xs font-medium">Account</h2>
          <Badge variant={profile.role === "ADMIN" ? "default" : "outline"}>
            {profile.role}
          </Badge>
        </div>

        <div className="flex flex-col gap-1 bg-muted px-3 py-2.5 text-[10px] text-muted-foreground ring-1 ring-foreground/10">
          <p className="truncate">{profile.email ?? "no email"}</p>
          <p className="truncate tabular-nums">{profile.id}</p>
        </div>

        <Form
          schema={schema}
          onSubmit={onSubmit}
          defaultValues={{ name: profile.name ?? "" }}
          className="flex flex-col gap-3"
        >
          {({ formState: { isSubmitting } }) => (
            <>
              <FormInput<Values>
                name="name"
                label="Display name"
                placeholder="No name set"
              />
              <Button type="submit" className="self-end" disabled={isSubmitting}>
                Save
              </Button>
            </>
          )}
        </Form>
      </section>

      {/* Data overview */}
      <section className="flex flex-col gap-3 bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-xs font-medium">Your data</h2>
        <div className="grid grid-cols-2 gap-px bg-border ring-1 ring-foreground/10 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="bg-card px-3 py-2.5">
              <p className="font-heading text-lg font-medium tabular-nums">
                {s.value}
              </p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Appearance */}
      <section className="flex flex-col gap-3 bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-xs font-medium">Appearance</h2>
        <ThemeSwitch />
      </section>

      {/* Danger zone */}
      <section className="flex flex-col gap-3 bg-card p-4 ring-1 ring-destructive/30">
        <h2 className="font-heading text-xs font-medium text-destructive">
          Danger zone
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium">Reset personal data</p>
            <p className="text-[10px] text-muted-foreground">
              Deletes your transactions, funds, purposes, and rules. Group data
              is untouched. The account stays.
            </p>
          </div>
          <ConfirmPopover
            align="end"
            message={
              <>
                Reset all your personal finance data? {resetTotal} records
                (transactions, funds, purposes, rules) will be permanently
                deleted. Group data is kept. This cannot be undone.
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
        </div>
      </section>
    </div>
  );
}

export { ProfileCard };
