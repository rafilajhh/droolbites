import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { mariadbUrl } from "./db-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaClass?: typeof PrismaClient };

// Dev keeps one client across reloads. After `prisma generate` (a migration) the reloaded module brings a
// new PrismaClient class, and the kept client still knows only the old columns: it is replaced then (the
// old one is left alone, as a module not reloaded yet may still be using it).
const kept = globalForPrisma.prismaClass === PrismaClient ? globalForPrisma.prisma : undefined;

export const db = kept ?? new PrismaClient({ adapter: new PrismaMariaDb(mariadbUrl()) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaClass = PrismaClient;
}

/**
 * A Prisma `contains` filter that matches the text literally. Prisma sends `contains` to MySQL as
 * LIKE '%…%' without escaping, so a search for "%" or "_" would match every row; the wildcards (and
 * the backslash, MySQL's LIKE escape character) are escaped here.
 */
export function containsText(q: string) {
  return { contains: q.replace(/[\\%_]/g, (c) => `\\${c}`) };
}
