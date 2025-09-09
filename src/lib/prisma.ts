import { PrismaClient } from '@prisma/client';

// Ensure global typing is extended
declare global {
  // Only one PrismaClient per process
  var prisma: PrismaClient | undefined;
}

const prisma = globalThis.prisma ?? new PrismaClient();

// In development, attach to global object to avoid creating new instances on HMR
if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export default prisma;
