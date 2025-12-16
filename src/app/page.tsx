import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { TodoLists } from "~/app/_components/todo-list";
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
      <main className="flex min-h-screen flex-col bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">My Todo Lists</h1>
            <form>
              <button
                className="rounded-md bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/20"
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
