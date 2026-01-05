import { redirect } from "next/navigation";

import { Logo } from "~/app/_components/logo";
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
            <Logo className="text-gray-100 hidden" />
            <h1 className="text-xl font-bold text-gray-100 md:text-3xl">Lysje</h1>
          </>
        }
      >
        {children}
      </ListsLayoutClient>
    </HydrateClient>
  );
}

