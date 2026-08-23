import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppShell from "@/components/shell/AppShell";
import ArtistDetail from "@/components/artists/ArtistDetail";
import Login from "@/components/Login";

interface ArtistPageProps {
  params: { artistId: string };
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  // Same gate as the home page — a direct hit on this URL while signed out
  // would otherwise render a shell whose API calls all 401.
  const session = await getServerSession(authOptions);
  if (!session) return <Login />;

  return (
    <AppShell>
      <ArtistDetail artistId={params.artistId} />
    </AppShell>
  );
}
