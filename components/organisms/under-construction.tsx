import { Wrench } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

type Props = {
  title: string;
  description?: string;
  icon?: Icon;
};

function UnderConstruction({ title, description, icon: HeroIcon = Wrench }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex size-12 items-center justify-center bg-muted ring-1 ring-foreground/10">
        <HeroIcon className="size-6 text-muted-foreground" weight="duotone" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-sm font-medium">{title}</h2>
        <p className="max-w-xs text-xs text-muted-foreground">
          {description ?? "This page is under development. Check back soon."}
        </p>
      </div>
      <span className="bg-muted px-2 py-1 text-[10px] text-muted-foreground ring-1 ring-foreground/10">
        Under development
      </span>
    </div>
  );
}

export { UnderConstruction };
