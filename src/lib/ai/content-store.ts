import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { StoredContent } from "./schema";

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export interface Versions {
  diagnostic: number;
  challenge: number;
}

export function readStored(content: {
  reviewModulesJson: unknown;
  diagnosticPoolJson: unknown;
  challengePoolJson: unknown;
  diagnosticVersion: number;
  challengeVersion: number;
} | null): { content: StoredContent; versions: Versions } {
  return {
    content: {
      review: asArray(content?.reviewModulesJson),
      diagnostic: asArray(content?.diagnosticPoolJson),
      challenge: asArray(content?.challengePoolJson),
    },
    versions: { diagnostic: content?.diagnosticVersion ?? 1, challenge: content?.challengeVersion ?? 1 },
  };
}

export function saveContent(routeId: string, c: StoredContent, v: Versions) {
  const data = {
    reviewModulesJson: c.review as Prisma.InputJsonValue,
    diagnosticPoolJson: c.diagnostic as Prisma.InputJsonValue,
    challengePoolJson: c.challenge as Prisma.InputJsonValue,
    diagnosticVersion: v.diagnostic,
    challengeVersion: v.challenge,
  };
  return db.routeContent.upsert({ where: { routeId }, create: { routeId, ...data }, update: data });
}
