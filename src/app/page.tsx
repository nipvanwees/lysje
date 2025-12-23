import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { TodoLists } from "~/app/_components/todo-list";
import { Logo } from "~/app/_components/logo";
import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
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
              <h1 className="text-3xl font-bold text-gray-100">My Todo Lists</h1>
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
          <div className="flex-1">
            <TodoLists />
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
