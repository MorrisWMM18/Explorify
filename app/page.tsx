import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppShell from "@/components/shell/AppShell";
import NowPlayingCard from "@/components/player/NowPlayingCard";
import RecommendedSongs from "@/components/songs/RecommendedSongs";
import ArtistCarousel from "@/components/artists/ArtistCarousel";
import Login from "@/components/Login";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) return <Login />;

  return (
    <AppShell>
      <NowPlayingCard />
      <RecommendedSongs />
      <ArtistCarousel />
    </AppShell>
  );
}
