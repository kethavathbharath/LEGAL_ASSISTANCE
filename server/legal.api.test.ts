import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { ENV } from "./_core/env";
import type { TrpcContext } from "./_core/context";

function caller() {
  const ctx: TrpcContext = {
    user: undefined,
    req: {
      protocol: "http",
      headers: {},
      ip: "api-test",
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe("legal API", () => {
  it("returns a safe validation error for unsupported files", async () => {
    await expect(
      caller().legal.analyze({
        name: "payload.exe",
        size: 12,
        data: Buffer.from("hello").toString("base64"),
      })
    ).rejects.toThrow("Unsupported file type");
  });

  it("supports a valid text upload through the tRPC procedure", async () => {
    const previousKey = ENV.forgeApiKey;
    ENV.forgeApiKey = "";
    try {
      const result = await caller().legal.analyze({
        name: "notice.txt",
        size: 78,
        data: Buffer.from(
          "NOTICE\nEither party may terminate with 30 days notice. Payment is due within 15 days."
        ).toString("base64"),
      });
      expect(result.name).toBe("notice.txt");
      expect(result.analysis.termination).toContain("terminate");
    } finally {
      ENV.forgeApiKey = previousKey;
    }
  });

  it("answers from a document and compares two available records", async () => {
    const previousKey = ENV.forgeApiKey;
    ENV.forgeApiKey = "";
    try {
      const first = await caller().legal.analyze({
        name: "original.txt",
        size: 80,
        data: Buffer.from(
          "AGREEMENT\nPayment is due within 15 days. Termination requires 14 days notice."
        ).toString("base64"),
      });
      const second = await caller().legal.analyze({
        name: "revision.txt",
        size: 80,
        data: Buffer.from(
          "AGREEMENT\nPayment is due within 30 days. Termination requires 30 days notice."
        ).toString("base64"),
      });
      const answer = await caller().legal.ask({
        documentId: first.id,
        question: "What is the payment timing?",
      });
      const comparison = await caller().legal.compare({
        documentAId: first.id,
        documentBId: second.id,
      });
      expect(answer.answer.length).toBeGreaterThan(20);
      expect(comparison.changes.length).toBeGreaterThan(0);
    } finally {
      ENV.forgeApiKey = previousKey;
    }
  });
});
