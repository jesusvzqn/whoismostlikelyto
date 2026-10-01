import { PreGameFlow } from "@/components/PreGameFlow";

export default function JoinPage({
  params,
}: {
  params: { code: string };
}) {
  return (
    <main className="min-h-[100dvh] bg-background">
      <PreGameFlow initialJoinCode={params.code.toUpperCase()} />
    </main>
  );
}
