"use client";

import { SidebarProvider } from "~/app/_components/sidebar-provider";
import { TodoListSidebar } from "~/app/_components/todo-list-sidebar";
import { MobileMenuButton } from "~/app/_components/mobile-menu-button";

interface ListsLayoutClientProps {
  headerContent: React.ReactNode;
  children: React.ReactNode;
}

export function ListsLayoutClient({ headerContent, children }: ListsLayoutClientProps) {
  return (
    <main className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <SidebarProvider>
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 md:px-6 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MobileMenuButton />
              {headerContent}
            </div>
          </div>
          <div className="relative flex h-full gap-6">
            <TodoListSidebar />
            <div className="flex-1 min-w-0">{children}</div>
          </div>
        </div>
      </SidebarProvider>
    </main>
  );
}

