import Profile from "@/components/profile/Profile";

export default async function ProfilePage({ params }: { params: Promise<{ userName: string }> }) {
  const { userName } = await params;
  return <Profile userName={userName} />;
}


