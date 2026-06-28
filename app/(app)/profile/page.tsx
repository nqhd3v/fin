import { getMyProfile } from "@/handlers/profile";
import { ProfileCard } from "@/components/organisms/profile-card";

export default async function ProfilePage() {
  const profile = await getMyProfile();

  return (
    <>
      <header className="flex items-center border-b border-foreground/10 px-4 py-3">
        <h1 className="font-heading text-sm font-medium">Profile</h1>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
        <ProfileCard profile={profile} />
      </main>
    </>
  );
}
