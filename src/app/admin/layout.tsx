// ============================================
// ASG Leads — Admin Layout (Server-Side Protection)
// ============================================
// Protects all /admin routes with server-side session verification
// and role-based authorization enforcement

import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/user-service";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verify session server-side
  const session = await validateSession();

  if (!session) {
    redirect("/login");
  }

  // Get user profile to check role
  const profile = await getUserProfile(session.uid);

  // No profile, disabled user, or non-admin → redirect
  if (!profile || profile.status === "disabled") {
    redirect("/login");
  }

  // Only admins can access admin routes
  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
