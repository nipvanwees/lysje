import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Logo } from "~/app/_components/logo";
import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";
import { HydrateClient } from "~/trpc/server";
import { ListsLayoutClient } from "~/app/_components/lists-layout-client";

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
      <ListsLayoutClient
        headerContent={
          <>
            <Logo className="text-gray-100" />
            <h1 className="text-xl font-bold text-gray-100 md:text-3xl">My Todo Lists</h1>
          </>
        }
        signOutButton={
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
        }
      >
        {children}
      </ListsLayoutClient>
    </HydrateClient>
  );
}

