import { redirect } from "next/navigation";
import Brand from "@/components/Brand";
import LoginForm from "@/components/admin/LoginForm";
import { getAdminContext } from "@/lib/admin";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const destination = next === "/admin/dashboard" ? next : "/admin";
  const ctx = await getAdminContext();
  if (ctx.state === "ok") redirect(destination);

  return (
    <main className="admin-login">
      <div className="admin-login__card">
        <Brand href={null} size="login" priority />
        <h1>Admin sign-in</h1>
        {ctx.state === "unconfigured" ? (
          <p className="admin-error" role="alert">
            Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your environment
            (see README.md), then restart the server.
          </p>
        ) : (
          <>
            {ctx.state === "forbidden" ? (
              <p className="admin-error" role="alert">
                You are signed in as {ctx.user.email}, but this account has not been granted admin access. See “Create the first admin”
                in README.md.
              </p>
            ) : null}
            <LoginForm destination={destination} />
          </>
        )}
      </div>
    </main>
  );
}
