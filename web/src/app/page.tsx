import { GameShell } from "@/components/game-shell";

export default async function Home({ searchParams }: { searchParams: Promise<{ round?: string; game?: string }> }) {
  const { round, game } = await searchParams;
  return <GameShell key={round ?? game ?? "default-round"} roundId={round} previewGame={round ? undefined : game} />;
}
