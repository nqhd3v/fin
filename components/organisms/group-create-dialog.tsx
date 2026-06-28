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
import { Form, FormInput } from "@/components/molecules/form";
import { createGroup } from "@/handlers/groups";

const schema = yup.object({
  name: yup.string().trim().required("Name is required"),
  passcode: yup.string().default(""),
});

type Values = yup.InferType<typeof schema>;

function GroupCreateDialog({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  async function onSubmit(values: Values) {
    const res = await createGroup({
      name: values.name,
      passcode: values.passcode || null,
    });
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Group created");
    setOpen(false);
    router.push(`/groups/${res.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create group</DialogTitle>
        </DialogHeader>
        <Form
          schema={schema}
          onSubmit={onSubmit}
          defaultValues={{ name: "", passcode: "" }}
          className="flex flex-col gap-4"
        >
          {({ formState: { isSubmitting } }) => (
            <>
              <FormInput<Values>
                name="name"
                label="Name"
                placeholder="e.g. Flatmates"
                autoFocus
              />
              <FormInput<Values>
                name="passcode"
                label="Passcode (optional)"
                placeholder="Members enter this to join"
              />
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
                  Create
                </Button>
              </DialogFooter>
            </>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { GroupCreateDialog };
