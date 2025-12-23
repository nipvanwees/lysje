import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Logo } from "~/app/_components/logo";
import { TodoListSidebar } from "~/app/_components/todo-list-sidebar";
import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";
import { HydrateClient } from "~/trpc/server";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Redirect to login if not authenticated
  if (!session) {
    redirect("/login");
  }

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col bg-[#0a0a0a]">
        <div className="container mx-auto flex flex-col gap-3 px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo className="text-gray-100" />
              <h1 className="text-3xl font-bold text-gray-100">Settings</h1>
            </div>
            <form>
              <button
                className="rounded px-3 py-1.5 text-sm text-gray-400 transition hover:text-gray-200"
                formAction={async () => {
                  "use server";
                  await auth.api.signOut({
                    headers: await headers(),
                  });
                  redirect("/login");
                }}
              >
                Sign out
              </button>
            </form>
          </div>
          <div className="flex h-full gap-6">
            <TodoListSidebar />
            <div className="flex-1">{children}</div>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}

