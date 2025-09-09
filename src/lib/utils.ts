// IT APPEARS THAT BIG CALENDAR SHOWS THE LAST WEEK WHEN THE CURRENT DAY IS A WEEKEND.
// FOR THIS REASON WE'LL GET THE LAST WEEK AS THE REFERENCE WEEK.
// IN THE TUTORIAL WE'RE TAKING THE NEXT WEEK AS THE REFERENCE WEEK.

import { Prisma } from "@prisma/client";
import prisma from "./prisma";

const getLatestMonday = (): Date => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const latestMonday = today;
  latestMonday.setDate(today.getDate() - daysSinceMonday);
  return latestMonday;
};

export const adjustScheduleToCurrentWeek = (
  lessons: { title: string; }[]
): { title: string }[] => {
  return lessons.map((lesson) => ({
    title: lesson.title,
  }));
};


type ClerkError = {
  clerkError: boolean;
  errors: { message: string }[];
};

type KnownPrismaError = Prisma.PrismaClientKnownRequestError & {
  code: string;
  meta?: any;
};

type UnknownError = {
  message?: string;
};

export async function getUnseenAnnouncementCount(
  userId: string,
  role: string
): Promise<number> {
  const query: Prisma.AnnouncementWhereInput = {};
  console.log("role:", role);
  console.log("userId:", userId);
  switch (role) {
    case "admin":
      // Admin sees all announcements
      break;

    case "teacher":
      query.OR = [
        { classId: null },
        {
          class: {
            lessons: {
              some: {
                teacherId: userId,
              },
            },
          },
        },
      ];
      break;

    case "student":
      query.OR = [
        { classId: null },
        {
          class: {
            students: {
              some: {
                id: userId,
              },
            },
          },
        },
      ];
      break;

    case "parent":
      break;

    case "accountant":
      query.OR = [
        { classId: null },
        // Add more conditions if accountants have specific announcements
      ];
      break;

    default:
      // Unknown role
      return 0;
  }

  const unseenCount = await prisma.announcement.count({
    where: {
      ...query,
      views: {
        none: {
          userId,
        },
      },
    },
  });

  return unseenCount;
}

export const createErrorMessage = (
  err: ClerkError | KnownPrismaError | UnknownError | unknown
): string => {
  console.error("Caught error:", err);

  let errorMessage = "Something went wrong!";

  if (
    typeof err === "object" &&
    err !== null &&
    "clerkError" in err &&
    Array.isArray((err as ClerkError).errors)
  ) {
    // Clerk error handling
    const clerkError = err as ClerkError;
    const firstError = clerkError.errors[0];
console.log("first err:",firstError)
    errorMessage = firstError?.message || errorMessage;
  } else if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof err.code === "string"
  ) {
    const prismaError = err as KnownPrismaError;

    switch (prismaError.code) {
      // Common constraint errors
      case "P2000":
        errorMessage =
          "The provided value for the column is too long for the column's type.";
        break;
      case "P2001":
        errorMessage =
          "The record searched for in the where condition does not exist.";
        break;
      case "P2002":
        const target = Array.isArray(prismaError.meta?.target)
          ? prismaError.meta.target.join(", ")
          : prismaError.meta?.target || "field";
        errorMessage = `A record with the same ${target} already exists.`;
        break;
      case "P2003":
        const field = prismaError.meta?.field_name;
        errorMessage = `Foreign key constraint failed on ${field}. Make sure related data exists.`;
        break;
      case "P2004":
        errorMessage = "A constraint failed on the database.";
        break;
      case "P2005":
        const storedValue = prismaError.meta?.database_value;
        errorMessage = `The value stored in the database is invalid: ${storedValue}`;
        break;
      case "P2006":
        const providedValue = prismaError.meta?.database_value;
        errorMessage = `The provided value is invalid: ${providedValue}`;
        break;
      case "P2007":
        errorMessage = "Data validation error.";
        break;
      case "P2008":
        errorMessage = "Failed to parse the query.";
        break;
      case "P2009":
        errorMessage = "Failed to validate the query.";
        break;
      case "P2010":
        errorMessage = "Raw query failed.";
        break;
      case "P2011":
        const constraint = prismaError.meta?.constraint;
        errorMessage = `Null constraint violation on ${constraint}`;
        break;
      case "P2012":
        const missingValue = prismaError.meta?.path;
        errorMessage = `Missing a required value at ${missingValue}`;
        break;
      case "P2013":
        const missingArgument = prismaError.meta?.argument_name;
        errorMessage = `Missing the required argument ${missingArgument}`;
        break;
      case "P2014":
        const relation = prismaError.meta?.relation_name;
        errorMessage = `The change would violate the required relation '${relation}'`;
        break;
      case "P2015":
        errorMessage = "A related record could not be found.";
        break;
      case "P2016":
        errorMessage = "Query interpretation error.";
        break;
      case "P2017":
        const relationField = prismaError.meta?.relation_name;
        errorMessage = `The records for relation '${relationField}' are not connected.`;
        break;
      case "P2018":
        const requiredConnectedRecords = prismaError.meta?.relation_name;
        errorMessage = `The required connected records for '${requiredConnectedRecords}' were not found.`;
        break;
      case "P2019":
        errorMessage = "Input error.";
        break;
      case "P2020":
        errorMessage = "Value out of range for the type.";
        break;
      case "P2021":
        const table = prismaError.meta?.table;
        errorMessage = `The table '${table}' does not exist in the current database.`;
        break;
      case "P2022":
        const column = prismaError.meta?.column;
        errorMessage = `The column '${column}' does not exist in the current database.`;
        break;
      case "P2023":
        errorMessage = "Inconsistent column data.";
        break;
      case "P2024":
        errorMessage =
          "Timed out fetching a new connection from the connection pool.";
        break;
      case "P2025":
        errorMessage = "Record to update/delete does not exist.";
        break;
      case "P2026":
        errorMessage =
          "The current database provider doesn't support a feature that the query used.";
        break;
      case "P2027":
        errorMessage =
          "Multiple errors occurred on the database during query execution.";
        break;
      case "P2028":
        errorMessage = "Transaction API error.";
        break;
      case "P2030":
        errorMessage = "Cannot find a fulltext index to use for the search.";
        break;
      case "P2031":
        errorMessage =
          "Prisma needs to perform transactions, which requires your MongoDB server to be run as a replica set.";
        break;
      case "P2033":
        errorMessage =
          "A number used in the query does not fit into a 64 bit signed integer.";
        break;
      case "P2034":
        errorMessage =
          "Transaction failed due to a write conflict or a deadlock.";
        break;
      case "P2035":
        errorMessage = "Assertion violation on the database.";
        break;
      case "P2036":
        errorMessage = "Error in external connector.";
        break;
      case "P2037":
        errorMessage = "Too many database connections opened.";
        break;

      // Migration errors (P3xxx)
      case "P3000":
        errorMessage = "Failed to create database.";
        break;
      case "P3001":
        errorMessage =
          "Migration possible with destructive changes and possible data loss.";
        break;
      case "P3002":
        errorMessage = "The attempted migration was rolled back.";
        break;
      case "P3003":
        errorMessage =
          "The format of migrations changed, the saved migrations are no longer valid.";
        break;
      case "P3004":
        errorMessage =
          "The database is a system database, it should not be altered with prisma migrate.";
        break;
      case "P3005":
        errorMessage = "The database schema is not empty.";
        break;
      case "P3006":
        errorMessage =
          "Migration failed to apply cleanly to the shadow database.";
        break;
      case "P3007":
        errorMessage =
          "Some of the requested preview features are not yet allowed in migration engine.";
        break;
      case "P3008":
        errorMessage =
          "The migration is already recorded as applied in the database.";
        break;
      case "P3009":
        errorMessage =
          "migrate found failed migrations in the target database.";
        break;
      case "P3010":
        errorMessage = "The name of the migration is too long.";
        break;
      case "P3011":
        errorMessage =
          "Migration cannot be rolled back because it was never applied to the database.";
        break;
      case "P3012":
        errorMessage =
          "Migration cannot be rolled back because it is not in a failed state.";
        break;
      case "P3013":
        errorMessage = "Datasource provider arrays are no longer supported.";
        break;
      case "P3014":
        errorMessage = "Prisma Migrate could not create the shadow database.";
        break;
      case "P3015":
        errorMessage = "Could not find the migration file.";
        break;
      case "P3016":
        errorMessage = "The fallback method for database resets failed.";
        break;
      case "P3017":
        errorMessage = "The migration could not be found.";
        break;
      case "P3018":
        errorMessage = "A migration failed to apply.";
        break;
      case "P3019":
        errorMessage =
          "The datasource provider is not supported for the operation.";
        break;
      case "P3020":
        errorMessage =
          "The automatic creation of shadow databases is disabled on Azure SQL.";
        break;
      case "P3021":
        errorMessage = "Foreign keys cannot be created on this database.";
        break;
      case "P3022":
        errorMessage =
          "Direct execution of DDL (Data Definition Language) SQL statements is disabled for this database.";
        break;

      // Prisma Client errors (P4xxx)
      case "P4000":
        errorMessage =
          "Introspection operation failed to produce a schema file.";
        break;
      case "P4001":
        errorMessage = "The introspected database was empty.";
        break;
      case "P4002":
        errorMessage =
          "The schema of the introspected database was inconsistent.";
        break;

      // Engine errors (P5xxx)
      case "P5000":
        errorMessage = "This feature is not implemented yet.";
        break;
      case "P5001":
        errorMessage = "This feature is not supported on the database.";
        break;
      case "P5002":
        errorMessage = "The engine could not connect to the database.";
        break;
      case "P5003":
        errorMessage = "The database does not exist.";
        break;
      case "P5004":
        errorMessage = "The database server timed out at startup.";
        break;
      case "P5005":
        errorMessage = "Authentication failed against database server.";
        break;
      case "P5006":
        errorMessage =
          "We could not determine the version of the database server.";
        break;
      case "P5007":
        errorMessage =
          "The connector is not supported on the given database version.";
        break;
      case "P5008":
        errorMessage =
          "The operations you are trying to perform requires a newer version of the database.";
        break;
      case "P5009":
        errorMessage = "The database server was not reachable.";
        break;
      case "P5010":
        errorMessage = "Access denied to database.";
        break;
      case "P5011":
        errorMessage = "Error opening a TLS connection.";
        break;
      case "P5012":
        errorMessage = "Error querying the database.";
        break;
      case "P5013":
        errorMessage = "The provided database string is invalid.";
        break;
      case "P5014":
        errorMessage = "The kind of database server is not supported.";
        break;
      case "P5015":
        errorMessage =
          "No valid database connection URL found in environment variables.";
        break;

      default:
        errorMessage = `Database error [${prismaError.code}]: ${prismaError.message}`;
        break;
    }
  } else if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as any).message === "string"
  ) {
    errorMessage = (err as { message: string }).message;
  }

  return errorMessage;
};
