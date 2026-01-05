"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useSidebar } from "~/app/_components/sidebar-provider";
import { authClient } from "~/server/better-auth/client";

export function TodoListSidebar() {
  const pathname = usePathname();
  const { data: lists, isLoading } = api.todo.getAllLists.useQuery();
  const { isOpen, close } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);

  // Only set mounted after hydration to avoid hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close sidebar on mobile when navigating (but not on initial mount)
  const prevPathnameRef = useRef<string | null>(null);
  useEffect(() => {
    // Skip on initial mount (when prevPathnameRef.current is null)
    if (prevPathnameRef.current !== null && isOpen && prevPathnameRef.current !== pathname) {
      // Only close on mobile
      if (isMounted && window.innerWidth < 768) {
        close();
      }
    }
    prevPathnameRef.current = pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isMounted]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (!isMounted) return;
    
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isMounted]);

  const handleLinkClick = () => {
    if (isMounted && window.innerWidth < 768) {
      close();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/50 md:hidden"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            close();
          }}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-[100] h-full w-64 space-y-2 bg-[#0a0a0a] p-4 transition-transform duration-300 ease-in-out md:relative md:z-auto md:w-56 md:p-0 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {isLoading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          <>
        <div className="mb-4 flex items-center justify-between md:hidden">
          <h2 className="text-lg font-semibold text-gray-100">Menu</h2>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              close();
            }}
            className="rounded p-2 text-gray-400 transition hover:bg-[#141414] hover:text-gray-300 z-10"
            aria-label="Close menu"
            type="button"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <CreateTodoListForm />
        <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
          {lists?.map((list) => {
            const isActive = pathname === `/lists/${list.id}`;
            return (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                onClick={handleLinkClick}
                className={`block w-full rounded px-3 py-2 text-left transition ${
                  isActive
                    ? "bg-[#1a1a1a] text-gray-100"
                    : "text-gray-400 hover:bg-[#141414] hover:text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  {list.icon && <span className="text-2xl">{list.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{list.name}</h3>
                    {list.description && (
                      <p className="text-sm text-gray-500 truncate">{list.description}</p>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  {list.items.length} items
                </p>
              </Link>
            );
          })}
        </div>
        <div className="pt-4 border-t border-[#252525] space-y-1">
          <Link
            href="/settings"
            onClick={handleLinkClick}
            className={`block w-full rounded px-3 py-2 text-left transition ${
              pathname === "/settings"
                ? "bg-[#1a1a1a] text-gray-100"
                : "text-gray-400 hover:bg-[#141414] hover:text-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              <span className="text-sm font-semibold">Settings</span>
            </div>
          </Link>
          <SignOutButton />
        </div>
          </>
        )}
      </div>
    </>
  );
}

function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="block w-full rounded px-3 py-2 text-left text-sm text-gray-400 transition hover:bg-[#141414] hover:text-gray-300"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">🚪</span>
        <span className="font-semibold">Sign out</span>
      </div>
    </button>
  );
}

function CreateTodoListForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const utils = api.useUtils();
  const router = useRouter();

  const createList = api.todo.createList.useMutation({
    onSuccess: (newList) => {
      void utils.todo.getAllLists.invalidate();
      setName("");
      setDescription("");
      setIcon("");
      setIsOpen(false);
      // Navigate to the newly created list
      if (newList) {
        router.push(`/lists/${newList.id}`);
      }
    },
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded px-3 py-2 text-left text-sm text-gray-500 transition hover:bg-[#141414] hover:text-gray-300"
      >
        + Create New List
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createList.mutate({ name, description: description || undefined, icon: icon || undefined });
      }}
      className="space-y-2 rounded bg-[#141414] p-3"
    >
      <input
        type="text"
        placeholder="List name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded border border-[#252525] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#333] focus:outline-none"
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded border border-[#252525] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#333] focus:outline-none"
      />
      <input
        type="text"
        placeholder="Icon emoji (optional)"
        value={icon}
        onChange={(e) => setIcon(e.target.value)}
        className="w-full rounded border border-[#252525] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#333] focus:outline-none"
        maxLength={2}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createList.isPending}
          className="flex-1 rounded bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-[#222] disabled:opacity-50"
        >
          {createList.isPending ? "Creating..." : "Create"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setName("");
            setDescription("");
            setIcon("");
          }}
          className="rounded bg-[#0f0f0f] px-4 py-2 text-sm font-semibold text-gray-500 transition hover:bg-[#141414] hover:text-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

