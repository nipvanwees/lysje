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
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Get a single todo list with items
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
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!list) {
        throw new Error("Todo list not found");
      }

      return list;
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

      return ctx.db.listItem.create({
        data: {
          title: input.title,
          description: input.description,
          deadline: input.deadline,
          todoListId: input.todoListId,
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
});


