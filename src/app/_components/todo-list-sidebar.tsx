"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function TodoListSidebar() {
  const pathname = usePathname();
  const { data: lists, isLoading } = api.todo.getAllLists.useQuery();

  if (isLoading) {
    return (
      <div className="w-56">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-56 space-y-2">
      <CreateTodoListForm />
      <div className="space-y-1">
        {lists?.map((list) => {
          const isActive = pathname === `/lists/${list.id}`;
          return (
            <Link
              key={list.id}
              href={`/lists/${list.id}`}
              className={`block w-full rounded px-3 py-2 text-left transition ${
                isActive
                  ? "bg-[#1a1a1a] text-gray-100"
                  : "text-gray-400 hover:bg-[#141414] hover:text-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {list.icon && <span className="text-2xl">{list.icon}</span>}
                <div className="flex-1">
                  <h3 className="font-semibold">{list.name}</h3>
                  {list.description && (
                    <p className="text-sm text-gray-500">{list.description}</p>
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
      <div className="pt-4 border-t border-[#252525]">
        <Link
          href="/settings"
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
      </div>
    </div>
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

