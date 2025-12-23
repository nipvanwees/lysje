"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function TodoListItems({ listId }: { listId: string }) {
  const router = useRouter();
  const { data: list, isLoading } = api.todo.getList.useQuery({ id: listId });
  const utils = api.useUtils();

  const toggleItem = api.todo.toggleItem.useMutation({
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await utils.todo.getList.cancel({ id: listId });
      await utils.todo.getCompletedItems.cancel({ listId });

      // Snapshot the previous value
      const previousList = utils.todo.getList.getData({ id: listId });
      const previousCompleted = utils.todo.getCompletedItems.getData({ listId });

      // Find the item in active list (items in active list are always done: false)
      if (previousList) {
        const item = previousList.items.find((item) => item.id === id);
        if (item) {
          // Item is being checked - remove it from active list
          utils.todo.getList.setData({ id: listId }, (old) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.filter((i) => i.id !== id),
            };
          });

          // Add it to completed list (most recent first)
          const completedItem = {
            ...item,
            done: true,
            updatedAt: new Date(),
          };
          utils.todo.getCompletedItems.setData({ listId }, (old) => {
            if (!old) return [completedItem];
            // Check if already exists (shouldn't happen, but be safe)
            const exists = old.some((i) => i.id === id);
            if (exists) return old;
            return [completedItem, ...old];
          });
        }
      }

      // Check if item is in completed list (being unchecked)
      if (previousCompleted) {
        const item = previousCompleted.find((item) => item.id === id);
        if (item) {
          // Item is being unchecked - remove from completed list
          utils.todo.getCompletedItems.setData({ listId }, (old) => {
            if (!old) return old;
            return old.filter((i) => i.id !== id);
          });

          // Add it back to active list
          const activeItem = {
            ...item,
            done: false,
          };
          utils.todo.getList.setData({ id: listId }, (old) => {
            if (!old) return old;
            // Check if already exists (shouldn't happen, but be safe)
            const exists = old.items.some((i) => i.id === id);
            if (exists) return old;
            return {
              ...old,
              items: [...old.items, activeItem].sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime()
              ),
            };
          });
        }
      }

      return { previousList, previousCompleted };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousList) {
        utils.todo.getList.setData({ id: listId }, context.previousList);
      }
      if (context?.previousCompleted) {
        utils.todo.getCompletedItems.setData({ listId }, context.previousCompleted);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      void utils.todo.getList.invalidate({ id: listId });
      void utils.todo.getAllLists.invalidate();
      void utils.todo.getCompletedItems.invalidate({ listId });
    },
  });

  const deleteItem = api.todo.deleteItem.useMutation({
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await utils.todo.getList.cancel({ id: listId });
      await utils.todo.getCompletedItems.cancel({ listId });

      // Snapshot the previous values
      const previousList = utils.todo.getList.getData({ id: listId });
      const previousCompleted = utils.todo.getCompletedItems.getData({ listId });

      // Optimistically remove from active list
      utils.todo.getList.setData({ id: listId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter((item) => item.id !== id),
        };
      });

      // Optimistically remove from completed list if present
      utils.todo.getCompletedItems.setData({ listId }, (old) => {
        if (!old) return old;
        return old.filter((item) => item.id !== id);
      });

      return { previousList, previousCompleted };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousList) {
        utils.todo.getList.setData({ id: listId }, context.previousList);
      }
      if (context?.previousCompleted) {
        utils.todo.getCompletedItems.setData({ listId }, context.previousCompleted);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      void utils.todo.getList.invalidate({ id: listId });
      void utils.todo.getAllLists.invalidate();
      void utils.todo.getCompletedItems.invalidate({ listId });
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

      <div className="space-y-2">
        {list.items.length === 0 ? (
          <p className="text-center text-sm text-gray-600">No active items. Add one below!</p>
        ) : (
          list.items.map((item) => (
            <TodoItem
              key={item.id}
              item={item}
              onToggle={() => toggleItem.mutate({ id: item.id })}
              onDelete={() => deleteItem.mutate({ id: item.id })}
              isDeleting={deleteItem.isPending}
            />
          ))
        )}
      </div>

      <CreateListItemForm listId={listId} />

      <CompletedItemsSection listId={listId} />
    </div>
  );
}

function TodoItem({
  item,
  onToggle,
  onDelete,
  isDeleting,
}: {
  item: {
    id: string;
    title: string;
    description: string | null;
    deadline: Date | null;
    done: boolean;
  };
  onToggle: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="rounded border border-[#1f1f1f] bg-[#141414] p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.done}
          onChange={onToggle}
          className="mt-1 h-5 w-5 cursor-pointer rounded border-[#333] bg-[#0f0f0f] text-gray-400 focus:ring-0"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-200">{item.title}</h3>
          {item.description && (
            <p className="mt-1 text-sm text-gray-500">{item.description}</p>
          )}
          {item.deadline && (
            <p
              className={`mt-1 text-xs ${
                new Date(item.deadline) < new Date()
                  ? "text-red-500"
                  : "text-gray-600"
              }`}
            >
              Deadline: {new Date(item.deadline).toLocaleDateString()}
            </p>
          )}
        </div>
        <button
          onClick={onDelete}
          className="text-gray-600 hover:text-gray-400"
          disabled={isDeleting}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function CompletedItemsSection({ listId }: { listId: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: completedItems, isLoading } = api.todo.getCompletedItems.useQuery(
    { listId },
    { enabled: isExpanded }, // Only fetch when expanded
  );
  const utils = api.useUtils();

  const toggleItem = api.todo.toggleItem.useMutation({
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await utils.todo.getList.cancel({ id: listId });
      await utils.todo.getCompletedItems.cancel({ listId });

      // Snapshot the previous values
      const previousList = utils.todo.getList.getData({ id: listId });
      const previousCompleted = utils.todo.getCompletedItems.getData({ listId });

      // Find the item in completed list and toggle it optimistically
      if (previousCompleted) {
        const item = previousCompleted.find((item) => item.id === id);
        if (item) {
          // Item is being unchecked - remove from completed, add to active
          utils.todo.getCompletedItems.setData({ listId }, (old) => {
            if (!old) return old;
            return old.filter((i) => i.id !== id);
          });

          // Add to active list
          utils.todo.getList.setData({ id: listId }, (old) => {
            if (!old) return old;
            const newItem = { ...item, done: false };
            return {
              ...old,
              items: [...old.items, newItem].sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime()
              ),
            };
          });
        }
      }

      return { previousList, previousCompleted };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousList) {
        utils.todo.getList.setData({ id: listId }, context.previousList);
      }
      if (context?.previousCompleted) {
        utils.todo.getCompletedItems.setData({ listId }, context.previousCompleted);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      void utils.todo.getList.invalidate({ id: listId });
      void utils.todo.getAllLists.invalidate();
      void utils.todo.getCompletedItems.invalidate({ listId });
    },
  });

  const deleteItem = api.todo.deleteItem.useMutation({
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await utils.todo.getCompletedItems.cancel({ listId });

      // Snapshot the previous value
      const previousCompleted = utils.todo.getCompletedItems.getData({ listId });

      // Optimistically remove from completed list
      utils.todo.getCompletedItems.setData({ listId }, (old) => {
        if (!old) return old;
        return old.filter((item) => item.id !== id);
      });

      return { previousCompleted };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousCompleted) {
        utils.todo.getCompletedItems.setData({ listId }, context.previousCompleted);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      void utils.todo.getList.invalidate({ id: listId });
      void utils.todo.getAllLists.invalidate();
      void utils.todo.getCompletedItems.invalidate({ listId });
    },
  });

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full rounded border border-[#1a1a1a] bg-[#0f0f0f] px-3 py-2 text-left text-sm text-gray-500 transition hover:border-[#252525] hover:text-gray-400"
      >
        Show completed items
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500">
          Completed
          {completedItems && completedItems.length > 0 && (
            <span className="ml-2 text-xs text-gray-600">
              ({completedItems.length})
            </span>
          )}
        </h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-xs text-gray-600 hover:text-gray-400"
        >
          Hide
        </button>
      </div>
      {isLoading ? (
        <p className="text-center text-sm text-gray-600">Loading completed items...</p>
      ) : !completedItems || completedItems.length === 0 ? (
        <p className="text-center text-sm text-gray-600">No completed items</p>
      ) : (
        <div className="space-y-2">
          {completedItems.map((item) => (
            <div
              key={item.id}
              className="rounded border border-[#1a1a1a] bg-[#0f0f0f] p-4 opacity-75"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleItem.mutate({ id: item.id })}
                  className="mt-1 h-5 w-5 cursor-pointer rounded border-[#333] bg-[#0f0f0f] text-gray-400 focus:ring-0"
                />
                <div className="flex-1">
                  <h3 className="font-semibold line-through text-gray-600">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                  )}
                  {item.deadline && (
                    <p className="mt-1 text-xs text-gray-600">
                      Deadline: {new Date(item.deadline).toLocaleDateString()}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-600">
                    Completed: {new Date(item.updatedAt).toLocaleDateString()}
                  </p>
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
          ))}
        </div>
      )}
    </div>
  );
}

function CreateListItemForm({ listId }: { listId: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const createItem = api.todo.createItem.useMutation({
    onMutate: async (newItem) => {
      // Cancel any outgoing refetches
      await utils.todo.getList.cancel({ id: listId });

      // Snapshot the previous value
      const previousList = utils.todo.getList.getData({ id: listId });

      // Generate a temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticItem = {
        id: tempId,
        title: newItem.title,
        description: newItem.description ?? null,
        deadline: newItem.deadline ?? null,
        done: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        todoListId: listId,
      };

      // Optimistically add the item
      utils.todo.getList.setData({ id: listId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: [...old.items, optimisticItem],
        };
      });

      // Clear form immediately
      setTitle("");
      setDescription("");
      setDeadline("");
      setShowAdvanced(false);
      titleInputRef.current?.focus();

      return { previousList, optimisticItem };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousList) {
        utils.todo.getList.setData({ id: listId }, context.previousList);
      }
      // Restore form values on error
      if (context?.optimisticItem) {
        setTitle(context.optimisticItem.title);
        if (context.optimisticItem.description) {
          setDescription(context.optimisticItem.description);
        }
        if (context.optimisticItem.deadline) {
          setDeadline(new Date(context.optimisticItem.deadline).toISOString().slice(0, 16));
        }
      }
    },
    onSuccess: (data, _variables, context) => {
      // Replace the temporary item with the real one from server
      utils.todo.getList.setData({ id: listId }, (old) => {
        if (!old || !context?.optimisticItem) return old;
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === context.optimisticItem.id
              ? {
                  ...data,
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                }
              : item
          ),
        };
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency
      void utils.todo.getList.invalidate({ id: listId });
      void utils.todo.getAllLists.invalidate();
    },
  });

  // Autofocus on mount
  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+N to focus input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Cmd (Mac) or Ctrl (Windows/Linux) + N is pressed
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        // Prevent default browser behavior (new window)
        e.preventDefault();
        // Only focus if we're not already in an input/textarea
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          titleInputRef.current?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    createItem.mutate({
      todoListId: listId,
      title: title.trim(),
      description: description.trim() || undefined,
      deadline: deadline ? new Date(deadline) : undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded border border-[#1f1f1f] bg-[#141414] p-3"
    >
      <div className="flex gap-2">
        <input
          ref={titleInputRef}
          type="text"
          placeholder="Add new item..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded border border-[#252525] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#333] focus:outline-none"
          required
        />
        <button
          type="submit"
          disabled={createItem.isPending || !title.trim()}
          className="flex items-center gap-1.5 rounded bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add item (Enter)"
        >
          {createItem.isPending ? (
            "Adding..."
          ) : (
            <>
              Add
              <kbd className="pointer-events-none hidden select-none items-center gap-1 rounded border border-[#333] bg-[#0f0f0f] px-1.5 font-mono text-[10px] font-medium text-gray-500 opacity-100 sm:flex">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-gray-500"
                >
                  <path
                    d="M2 6h8M6 2l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </kbd>
            </>
          )}
        </button>
        {!showAdvanced ? (
          <button
            type="button"
            onClick={() => setShowAdvanced(true)}
            className="rounded bg-[#0f0f0f] px-3 py-2 text-sm text-gray-500 transition hover:bg-[#1a1a1a] hover:text-gray-400"
            title="Show description and deadline options"
          >
            ⋯
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setShowAdvanced(false);
              setDescription("");
              setDeadline("");
            }}
            className="rounded bg-[#0f0f0f] px-3 py-2 text-sm text-gray-500 transition hover:bg-[#1a1a1a] hover:text-gray-400"
            title="Hide advanced options"
          >
            −
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="mt-2 space-y-2">
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border border-[#252525] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#333] focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowAdvanced(false);
                setDescription("");
                setDeadline("");
                titleInputRef.current?.focus();
              }
            }}
          />
          <input
            type="datetime-local"
            placeholder="Deadline (optional)"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded border border-[#252525] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#333] focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowAdvanced(false);
                setDescription("");
                setDeadline("");
                titleInputRef.current?.focus();
              }
            }}
          />
        </div>
      )}
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
  const [description, setDescription] = useState(list.description ?? "");
  const [icon, setIcon] = useState(list.icon ?? "");
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
      setDescription(list.description ?? "");
      setIcon(list.icon ?? "");
    }
  }, [list.name, list.description, list.icon, isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setName(list.name);
        setDescription(list.description ?? "");
        setIcon(list.icon ?? "");
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
                description: description ?? undefined,
                icon: icon ?? undefined,
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
                  setDescription(list.description ?? "");
                  setIcon(list.icon ?? "");
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

