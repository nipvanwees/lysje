import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

export default async function Home() {
  const session = await getSession();

  // Redirect to login if not authenticated
  if (!session) {
    redirect("/login");
  }

  // Get all lists and redirect to the first one
  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCaller(ctx);
  
  const lists = await caller.todo.getAllLists();
  
  if (lists.length > 0) {
    redirect(`/lists/${lists[0]!.id}`);
  }

  // If no lists exist, redirect to lists page (which will show empty state)
  redirect("/lists");
}
