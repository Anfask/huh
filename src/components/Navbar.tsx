import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import AnnouncementBadge from "./forms/AnnouncementBadge";
import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";

const Navbar = async () => {
  let user
  try {
     user = await currentUser();
  } catch (error:any) {
    console.log("err-----------:-",error.errors[0])
  }
  const userId = user?.id;
  const role = (user?.publicMetadata?.role as string) || "";

  let unseenCount = 0;

  if (userId && role) {
    // Build the same query structure as in AnnouncementListPage
    const query: Prisma.AnnouncementWhereInput = {
      views: {
        none: {
          userId: userId,
        },
      },
    };

    // Apply role-based filtering (same logic as AnnouncementListPage)
    switch (role) {
      case "admin":
        // Admin can see all announcements - no additional filtering needed
        break;

      case "teacher":
        query.OR = [
          { classId: null }, // General announcements for all classes
          {
            class: {
              supervisorId: userId,
            },
          }, // Classes they supervise
          {
            class: {
              lessons: {
                some: { teacherId: userId },
              },
            },
          }, // Classes where they teach lessons
        ];
        break;

      case "student":
        // Get the student's classId
        const student = await prisma.student.findUnique({
          where: { id: userId },
          select: { classId: true },
        });

        if (student) {
          query.OR = [
            { classId: null }, // General announcements for all classes
            { classId: student.classId }, // Announcements for their specific class
          ];
        } else {
          // If student not found, only show general announcements
          query.classId = null;
        }
        break;

      case "parent":
        // Get all classIds of the parent's children
        const parentStudents = await prisma.student.findMany({
          where: { parentId: userId },
          select: { classId: true },
        });

        const childrenClassIds = parentStudents.map(
          (student) => student.classId
        );

        if (childrenClassIds.length > 0) {
          query.OR = [
            { classId: null }, // General announcements for all classes
            { classId: { in: childrenClassIds } }, // Announcements for children's classes
          ];
        } else {
          // If no children found, only show general announcements
          query.classId = null;
        }
        break;

      default:
        // If no role or unknown role, only show general announcements
        query.classId = null;
        break;
    }

    // Count unseen announcements with the applied filters
    unseenCount = await prisma.announcement.count({
      where: query,
    });
  }

  return (
    <div className="flex items-center justify-between p-4">
      <div className="hidden md:flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2">
        <Image src="/search.png" alt="" width={14} height={14} />
        <input
          type="text"
          placeholder="Search..."
          className="w-[200px] p-2 bg-transparent outline-none"
          readOnly
        />
      </div>

      <div className="flex items-center gap-6 justify-end w-full">
        <AnnouncementBadge unseenCount={unseenCount} />

        <div className="flex flex-col">
          <span className="text-xs leading-3 font-medium">
            {user?.fullName || user?.firstName || "User"}
          </span>
          <span className="text-[10px] text-gray-500 text-right">{role}</span>
        </div>
        <UserButton />
      </div>
    </div>
  );
};

export default Navbar;
