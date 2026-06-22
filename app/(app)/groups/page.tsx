import { UsersThree } from "@phosphor-icons/react/dist/ssr";

import { UnderConstruction } from "@/components/organisms/under-construction";

export default function GroupsPage() {
  return (
    <>
      <header className="flex items-center border-b border-foreground/10 px-4 py-3">
        <h1 className="font-heading text-sm font-medium">Groups</h1>
      </header>
      <UnderConstruction
        icon={UsersThree}
        title="Groups"
        description="Share transactions with a team — member management and per-member analytics are coming."
      />
    </>
  );
}
