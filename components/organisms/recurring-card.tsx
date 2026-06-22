import { Plus } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/atoms/button";
import type { RecurringRow as Rule } from "@/handlers/recurring";
import { RecurringDialog } from "@/components/organisms/recurring-dialog";
import { RecurringRow } from "@/components/organisms/recurring-row";
import type { FundOption } from "@/components/organisms/transaction-dialog";

function RecurringCard({
  rules,
  funds,
}: {
  rules: Rule[];
  funds: FundOption[];
}) {
  return (
    <section className="flex flex-col gap-3 bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xs font-medium">Recurring</h2>
        <RecurringDialog
          funds={funds}
          trigger={
            <Button variant="ghost" size="xs">
              <Plus />
              Add
            </Button>
          }
        />
      </div>

      {rules.length === 0 ? (
        <p className="bg-card px-3 py-6 text-center text-xs text-muted-foreground ring-1 ring-foreground/10">
          No recurring transactions. Add salary, rent, subscriptions…
        </p>
      ) : (
        <div className="flex flex-col gap-px bg-border ring-1 ring-foreground/10">
          {rules.map((r) => (
            <RecurringRow key={r.id} rule={r} funds={funds} />
          ))}
        </div>
      )}
    </section>
  );
}

export { RecurringCard };
