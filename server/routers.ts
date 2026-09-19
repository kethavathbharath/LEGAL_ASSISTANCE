import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  answerQuestion,
  compareTexts,
  createDocument,
  getDemoDocument,
  getDocument,
  listDocuments,
} from "./legal";
import { TRPCError } from "@trpc/server";

const uploadInput = z.object({
  name: z.string().min(1).max(160),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  data: z.string().min(4).max(14_000_000),
});

function safeError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "The request could not be completed.";
  return message.length > 220
    ? "The document could not be processed. Check the file and try again."
    : message;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  legal: router({
    demo: publicProcedure.query(() => getDemoDocument()),
    documents: publicProcedure.query(() => listDocuments()),
    analyze: publicProcedure
      .input(uploadInput)
      .mutation(async ({ input, ctx }) => {
        try {
          if (!/^[A-Za-z0-9+/=]+$/.test(input.data))
            throw new Error("The uploaded data is invalid.");
          const buffer = Buffer.from(input.data, "base64");
          return await createDocument({
            name: input.name,
            size: input.size,
            data: buffer,
            requester: ctx.req.ip ?? "anonymous",
          });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: safeError(error),
          });
        }
      }),
    ask: publicProcedure
      .input(
        z.object({
          documentId: z.string().min(1).max(100),
          question: z.string().trim().min(3).max(600),
        })
      )
      .mutation(async ({ input }) => {
        const document = getDocument(input.documentId);
        if (!document)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "That document is no longer available in this session.",
          });
        try {
          return await answerQuestion(document.textPreview, input.question);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: safeError(error),
          });
        }
      }),
    compare: publicProcedure
      .input(
        z.object({
          documentAId: z.string().min(1).max(100),
          documentBId: z.string().min(1).max(100),
        })
      )
      .mutation(async ({ input }) => {
        const documentA = getDocument(input.documentAId);
        const documentB = getDocument(input.documentBId);
        if (!documentA || !documentB)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Both documents must be available in this session.",
          });
        try {
          return await compareTexts(
            documentA.textPreview,
            documentB.textPreview
          );
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: safeError(error),
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
