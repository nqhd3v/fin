import { User } from "@phosphor-icons/react/dist/ssr";

import { UnderConstruction } from "@/components/organisms/under-construction";

export default function ProfilePage() {
  return (
    <>
      <header className="flex items-center border-b border-foreground/10 px-4 py-3">
        <h1 className="font-heading text-sm font-medium">Profile</h1>
      </header>
      <UnderConstruction
        icon={User}
        title="Profile"
        description="Account settings, preferences, and sign-out will live here."
      />
    </>
  );
}
