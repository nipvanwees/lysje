import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const todoRouter = createTRPCRouter({
  // Get all todo lists for the current user
  getAllLists: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.todoList.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        items: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Get a single todo list with items (only active items)
  getList: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const list = await ctx.db.todoList.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          items: {
            where: { done: false },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          },
        },
      });

      if (!list) {
        throw new Error("Todo list not found");
      }

      return list;
    }),

  // Get completed items for a list (lazy loaded, ordered by when they were completed)
  getCompletedItems: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership of the todo list
      const list = await ctx.db.todoList.findFirst({
        where: {
          id: input.listId,
          userId: ctx.session.user.id,
        },
      });

      if (!list) {
        throw new Error("Todo list not found");
      }

      return ctx.db.listItem.findMany({
        where: {
          todoListId: input.listId,
          done: true,
        },
        orderBy: { updatedAt: "desc" }, // Most recently completed first (completed items don't use order)
      });
    }),

  // Create a new todo list
  createList: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        icon: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.todoList.create({
        data: {
          name: input.name,
          description: input.description,
          icon: input.icon,
          userId: ctx.session.user.id,
        },
      });
    }),

  // Update a todo list
  updateList: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership
      const list = await ctx.db.todoList.findFirst({
        where: { id, userId: ctx.session.user.id },
      });

      if (!list) {
        throw new Error("Todo list not found");
      }

      return ctx.db.todoList.update({
        where: { id },
        data,
      });
    }),

  // Delete a todo list
  deleteList: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const list = await ctx.db.todoList.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!list) {
        throw new Error("Todo list not found");
      }

      return ctx.db.todoList.delete({
        where: { id: input.id },
      });
    }),

  // Create a new list item
  createItem: protectedProcedure
    .input(
      z.object({
        todoListId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        deadline: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership of the todo list
      const list = await ctx.db.todoList.findFirst({
        where: {
          id: input.todoListId,
          userId: ctx.session.user.id,
        },
      });

      if (!list) {
        throw new Error("Todo list not found");
      }

      // Get the maximum order value for items in this list
      const maxOrderItem = await ctx.db.listItem.findFirst({
        where: { todoListId: input.todoListId, done: false },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const newOrder = maxOrderItem ? maxOrderItem.order + 1 : 0;

      return ctx.db.listItem.create({
        data: {
          title: input.title,
          description: input.description,
          deadline: input.deadline,
          todoListId: input.todoListId,
          order: newOrder,
        },
      });
    }),

  // Update a list item
  updateItem: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        deadline: z.date().nullable().optional(),
        done: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership through the todo list
      const item = await ctx.db.listItem.findFirst({
        where: { id },
        include: { todoList: true },
      });

      if (!item || item.todoList.userId !== ctx.session.user.id) {
        throw new Error("List item not found");
      }

      return ctx.db.listItem.update({
        where: { id },
        data,
      });
    }),

  // Delete a list item
  deleteItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through the todo list
      const item = await ctx.db.listItem.findFirst({
        where: { id: input.id },
        include: { todoList: true },
      });

      if (!item || item.todoList.userId !== ctx.session.user.id) {
        throw new Error("List item not found");
      }

      return ctx.db.listItem.delete({
        where: { id: input.id },
      });
    }),

  // Toggle item done status
  toggleItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through the todo list
      const item = await ctx.db.listItem.findFirst({
        where: { id: input.id },
        include: { todoList: true },
      });

      if (!item || item.todoList.userId !== ctx.session.user.id) {
        throw new Error("List item not found");
      }

      return ctx.db.listItem.update({
        where: { id: input.id },
        data: { done: !item.done },
      });
    }),

  // Reorder items in a list
  reorderItems: protectedProcedure
    .input(
      z.object({
        listId: z.string(),
        itemIds: z.array(z.string()), // Array of item IDs in the new order
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership of the todo list
      const list = await ctx.db.todoList.findFirst({
        where: {
          id: input.listId,
          userId: ctx.session.user.id,
        },
      });

      if (!list) {
        throw new Error("Todo list not found");
      }

      // Verify all items belong to this list
      const items = await ctx.db.listItem.findMany({
        where: {
          id: { in: input.itemIds },
          todoListId: input.listId,
        },
      });

      if (items.length !== input.itemIds.length) {
        throw new Error("Some items not found or don't belong to this list");
      }

      // Update order for each item based on its position in the array
      const updates = input.itemIds.map((itemId, index) =>
        ctx.db.listItem.update({
          where: { id: itemId },
          data: { order: index },
        }),
      );

      await Promise.all(updates);

      return { success: true };
    }),
});


