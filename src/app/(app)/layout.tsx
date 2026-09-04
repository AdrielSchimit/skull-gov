import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  if (session.configured && !session.user) redirect("/login");
  return <AppShell email={session.user?.email ?? null} role={session.role} configured={session.configured}>{children}</AppShell>;
}
