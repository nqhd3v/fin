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
import { joinGroup } from "@/handlers/groups";

const schema = yup.object({
  groupId: yup.string().trim().required("Group ID is required"),
  passcode: yup.string().default(""),
});

type Values = yup.InferType<typeof schema>;

function GroupJoinDialog({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  async function onSubmit(values: Values) {
    const res = await joinGroup({
      groupId: values.groupId,
      passcode: values.passcode || null,
    });
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Joined group");
    setOpen(false);
    router.push(`/groups/${res.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join group</DialogTitle>
        </DialogHeader>
        <Form
          schema={schema}
          onSubmit={onSubmit}
          defaultValues={{ groupId: "", passcode: "" }}
          className="flex flex-col gap-4"
        >
          {({ formState: { isSubmitting } }) => (
            <>
              <FormInput<Values>
                name="groupId"
                label="Group ID"
                placeholder="Paste the group ID shared with you"
                autoFocus
              />
              <FormInput<Values>
                name="passcode"
                label="Passcode"
                placeholder="If the group has one"
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
                  Join
                </Button>
              </DialogFooter>
            </>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { GroupJoinDialog };
