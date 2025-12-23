import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  // Get current user's settings
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        notificationTime: true,
        notificationDays: true,
        timezone: true,
      },
    });

    return {
      notificationTime: user?.notificationTime ?? null,
      notificationDays: user?.notificationDays
        ? user.notificationDays.split(",").map(Number)
        : null,
      timezone: user?.timezone ?? null,
    };
  }),

  // Update user settings
  updateSettings: protectedProcedure
    .input(
      z.object({
        notificationTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
        notificationDays: z.array(z.number().min(0).max(6)).optional().nullable(),
        timezone: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: {
        notificationTime?: string | null;
        notificationDays?: string | null;
        timezone?: string | null;
      } = {};

      if (input.notificationTime !== undefined) {
        updateData.notificationTime = input.notificationTime;
      }

      if (input.notificationDays !== undefined) {
        updateData.notificationDays =
          input.notificationDays.length > 0
            ? input.notificationDays.join(",")
            : null;
      }

      if (input.timezone !== undefined) {
        updateData.timezone = input.timezone;
      }

      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: updateData,
        select: {
          notificationTime: true,
          notificationDays: true,
          timezone: true,
        },
      });
    }),
});

