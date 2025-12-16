"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function TodoLists() {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const { data: lists, isLoading } = api.todo.getAllLists.useQuery();

  if (isLoading) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar with todo lists */}
      <div className="w-64 space-y-4">
        <CreateTodoListForm />
        <div className="space-y-2">
          {lists?.map((list) => (
            <button
              key={list.id}
              onClick={() => setSelectedListId(list.id)}
              className={`w-full rounded-lg p-4 text-left transition ${
                selectedListId === list.id
                  ? "bg-white/20"
                  : "bg-white/10 hover:bg-white/15"
              }`}
            >
              <div className="flex items-center gap-2">
                {list.icon && <span className="text-2xl">{list.icon}</span>}
                <div className="flex-1">
                  <h3 className="font-semibold">{list.name}</h3>
                  {list.description && (
                    <p className="text-sm text-gray-300">{list.description}</p>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {list.items.length} items
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main content with list items */}
      <div className="flex-1">
        {selectedListId ? (
          <TodoListItems listId={selectedListId} />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Select a list to view items
          </div>
        )}
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

  const createList = api.todo.createList.useMutation({
    onSuccess: () => {
      void utils.todo.getAllLists.invalidate();
      setName("");
      setDescription("");
      setIcon("");
      setIsOpen(false);
    },
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-lg bg-white/10 p-4 text-left transition hover:bg-white/20"
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
      className="space-y-2 rounded-lg bg-white/10 p-4"
    >
      <input
        type="text"
        placeholder="List name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 focus:border-white/40 focus:outline-none"
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 focus:border-white/40 focus:outline-none"
      />
      <input
        type="text"
        placeholder="Icon emoji (optional)"
        value={icon}
        onChange={(e) => setIcon(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 focus:border-white/40 focus:outline-none"
        maxLength={2}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createList.isPending}
          className="flex-1 rounded-md bg-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/30 disabled:opacity-50"
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
          className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function TodoListItems({ listId }: { listId: string }) {
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

  if (isLoading) {
    return <div className="text-white">Loading items...</div>;
  }

  if (!list) {
    return <div className="text-white">List not found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {list.icon && <span className="mr-2">{list.icon}</span>}
            {list.name}
          </h2>
          {list.description && (
            <p className="text-gray-300">{list.description}</p>
          )}
        </div>
        <DeleteListButton listId={listId} />
      </div>

      <CreateListItemForm listId={listId} />

      <div className="space-y-2">
        {list.items.length === 0 ? (
          <p className="text-center text-gray-400">No items yet. Add one above!</p>
        ) : (
          list.items.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg border p-4 ${
                item.done
                  ? "border-white/10 bg-white/5"
                  : "border-white/20 bg-white/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleItem.mutate({ id: item.id })}
                  className="mt-1 h-5 w-5 cursor-pointer"
                />
                <div className="flex-1">
                  <h3
                    className={`font-semibold ${
                      item.done ? "line-through text-gray-400" : "text-white"
                    }`}
                  >
                    {item.title}
                  </h3>
                  {item.description && (
                    <p
                      className={`mt-1 text-sm ${
                        item.done ? "text-gray-500" : "text-gray-300"
                      }`}
                    >
                      {item.description}
                    </p>
                  )}
                  {item.deadline && (
                    <p
                      className={`mt-1 text-xs ${
                        item.done
                          ? "text-gray-500"
                          : new Date(item.deadline) < new Date()
                            ? "text-red-400"
                            : "text-gray-400"
                      }`}
                    >
                      Deadline: {new Date(item.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteItem.mutate({ id: item.id })}
                  className="text-red-400 hover:text-red-300"
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
        className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-left transition hover:bg-white/20"
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
      className="space-y-2 rounded-lg border border-white/20 bg-white/10 p-4"
    >
      <input
        type="text"
        placeholder="Item title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 focus:border-white/40 focus:outline-none"
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 focus:border-white/40 focus:outline-none"
      />
      <input
        type="datetime-local"
        placeholder="Deadline (optional)"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 focus:border-white/40 focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createItem.isPending}
          className="flex-1 rounded-md bg-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/30 disabled:opacity-50"
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
          className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteListButton({ listId }: { listId: string }) {
  const utils = api.useUtils();
  const deleteList = api.todo.deleteList.useMutation({
    onSuccess: () => {
      void utils.todo.getAllLists.invalidate();
    },
  });

  return (
    <button
      onClick={() => {
        if (confirm("Are you sure you want to delete this list?")) {
          deleteList.mutate({ id: listId });
        }
      }}
      className="rounded-md bg-red-500/20 px-3 py-1 text-sm text-red-300 transition hover:bg-red-500/30"
      disabled={deleteList.isPending}
    >
      {deleteList.isPending ? "Deleting..." : "Delete List"}
    </button>
  );
}

