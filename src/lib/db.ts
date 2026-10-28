import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { mariadbUrl } from "./db-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaMariaDb(mariadbUrl()) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
