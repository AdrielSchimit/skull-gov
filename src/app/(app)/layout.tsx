import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionContext } from "@/lib/session-context";

export const dynamic = "force-dynamic";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();
  if (session.configured && !session.userId) redirect("/login");
  return (
    <AppShell
      email={session.email}
      role={session.role}
      configured={session.configured}
      tenantName={session.tenantName}
      companyName={session.companyName}
    >
      {children}
    </AppShell>
  );
}
