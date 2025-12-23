import { TodoListItems } from "~/app/_components/todo-list-items";

export default async function TodoListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TodoListItems listId={id} />;
}

