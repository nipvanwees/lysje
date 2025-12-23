"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function TodoListItems({ listId }: { listId: string }) {
  const router = useRouter();
  const { data: list, isLoading } = api.todo.getList.useQuery({ id: listId });
  const utils = api.useUtils();

  const toggleItem = api.todo.toggleItem.useMutation({
    onSuccess: () => {
      void utils.todo.getList.invalidate({ id: listId });
      void utils.todo.getAllLists.invalidate();
    },
  });

  const deleteItem = api.todo.deleteItem.useMutation({
    onSuccess: () => {
      void utils.todo.getList.invalidate({ id: listId });
      void utils.todo.getAllLists.invalidate();
    },
  });

  const deleteList = api.todo.deleteList.useMutation({
    onSuccess: () => {
      void utils.todo.getAllLists.invalidate();
      // Redirect to home, which will redirect to first list
      router.push("/");
    },
  });

  if (isLoading) {
    return <div className="text-gray-400">Loading items...</div>;
  }

  if (!list) {
    return <div className="text-gray-400">List not found</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">
            {list.icon && <span className="mr-2">{list.icon}</span>}
            {list.name}
          </h2>
          {list.description && (
            <p className="text-sm text-gray-500">{list.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <EditListModal list={list} listId={listId} />
          <button
            onClick={() => {
              if (confirm("Are you sure you want to delete this list?")) {
                deleteList.mutate({ id: listId });
              }
            }}
            className="rounded px-3 py-1 text-sm text-gray-600 transition hover:text-gray-400"
            disabled={deleteList.isPending}
          >
            {deleteList.isPending ? "Deleting..." : "Delete List"}
          </button>
        </div>
      </div>

      <CreateListItemForm listId={listId} />

      <div className="space-y-2">
        {list.items.length === 0 ? (
          <p className="text-center text-sm text-gray-600">No items yet. Add one above!</p>
        ) : (
          list.items.map((item) => (
            <div
              key={item.id}
              className={`rounded border p-4 ${
                item.done
                  ? "border-[#1a1a1a] bg-[#0f0f0f]"
                  : "border-[#1f1f1f] bg-[#141414]"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleItem.mutate({ id: item.id })}
                  className="mt-1 h-5 w-5 cursor-pointer rounded border-[#333] bg-[#0f0f0f] text-gray-400 focus:ring-0"
                />
                <div className="flex-1">
                  <h3
                    className={`font-semibold ${
                      item.done ? "line-through text-gray-600" : "text-gray-200"
                    }`}
                  >
                    {item.title}
                  </h3>
                  {item.description && (
                    <p
                      className={`mt-1 text-sm ${
                        item.done ? "text-gray-600" : "text-gray-500"
                      }`}
                    >
                      {item.description}
                    </p>
                  )}
                  {item.deadline && (
                    <p
                      className={`mt-1 text-xs ${
                        item.done
                          ? "text-gray-600"
                          : new Date(item.deadline) < new Date()
                            ? "text-red-500"
                            : "text-gray-600"
                      }`}
                    >
                      Deadline: {new Date(item.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteItem.mutate({ id: item.id })}
                  className="text-gray-600 hover:text-gray-400"
                  disabled={deleteItem.isPending}
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CreateListItemForm({ listId }: { listId: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const utils = api.useUtils();

  const createItem = api.todo.createItem.useMutation({
    onSuccess: () => {
      void utils.todo.getList.invalidate({ id: listId });
      void utils.todo.getAllLists.invalidate();
      setTitle("");
      setDescription("");
      setDeadline("");
      setIsOpen(false);
    },
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded border border-[#1f1f1f] bg-[#141414] px-3 py-2 text-left text-sm text-gray-500 transition hover:border-[#252525] hover:text-gray-300"
      >
        + Add Item
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createItem.mutate({
          todoListId: listId,
          title,
          description: description || undefined,
          deadline: deadline ? new Date(deadline) : undefined,
        });
      }}
      className="space-y-2 rounded border border-[#1f1f1f] bg-[#141414] p-3"
    >
      <input
        type="text"
        placeholder="Item title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
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
        type="datetime-local"
        placeholder="Deadline (optional)"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        className="w-full rounded border border-[#252525] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#333] focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createItem.isPending}
          className="flex-1 rounded bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-[#222] disabled:opacity-50"
        >
          {createItem.isPending ? "Adding..." : "Add Item"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setTitle("");
            setDescription("");
            setDeadline("");
          }}
          className="rounded bg-[#0f0f0f] px-4 py-2 text-sm font-semibold text-gray-500 transition hover:bg-[#141414] hover:text-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function EditListModal({
  list,
  listId,
}: {
  list: { id: string; name: string; description: string | null; icon: string | null };
  listId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description || "");
  const [icon, setIcon] = useState(list.icon || "");
  const utils = api.useUtils();

  const updateList = api.todo.updateList.useMutation({
    onSuccess: () => {
      void utils.todo.getList.invalidate({ id: listId });
      void utils.todo.getAllLists.invalidate();
      setIsOpen(false);
    },
  });

  // Update form values when list changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(list.name);
      setDescription(list.description || "");
      setIcon(list.icon || "");
    }
  }, [list.name, list.description, list.icon, isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setName(list.name);
        setDescription(list.description || "");
        setIcon(list.icon || "");
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, list.name, list.description, list.icon]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded px-3 py-1 text-sm text-gray-600 transition hover:text-gray-400"
      >
        Edit List
      </button>
    );
  }

  return (
    <>
      {/* Modal overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={() => setIsOpen(false)}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-lg border border-[#1f1f1f] bg-[#141414] p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="mb-4 text-xl font-bold text-gray-100">Edit List</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateList.mutate({
                id: listId,
                name,
                description: description || undefined,
                icon: icon || undefined,
              });
            }}
            className="space-y-3"
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
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={updateList.isPending}
                className="flex-1 rounded bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-[#222] disabled:opacity-50"
              >
                {updateList.isPending ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setName(list.name);
                  setDescription(list.description || "");
                  setIcon(list.icon || "");
                }}
                className="rounded bg-[#0f0f0f] px-4 py-2 text-sm font-semibold text-gray-500 transition hover:bg-[#141414] hover:text-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

