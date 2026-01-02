import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Logo } from "~/app/_components/logo";
import { TodoListSidebar } from "~/app/_components/todo-list-sidebar";
import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";
import { HydrateClient } from "~/trpc/server";
import { SidebarProvider } from "~/app/_components/sidebar-provider";
import { MobileMenuButton } from "~/app/_components/mobile-menu-button";

export default async function ListsLayout({
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
      <SidebarProvider>
        <main className="flex min-h-screen flex-col bg-[#0a0a0a]">
          <div className="container mx-auto flex flex-col gap-3 px-4 py-4 md:px-6 md:py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MobileMenuButton />
                <Logo className="text-gray-100" />
                <h1 className="text-xl font-bold text-gray-100 md:text-3xl">My Todo Lists</h1>
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
              <div className="flex-1 min-w-0">{children}</div>
            </div>
          </div>
        </main>
      </SidebarProvider>
    </HydrateClient>
  );
}

