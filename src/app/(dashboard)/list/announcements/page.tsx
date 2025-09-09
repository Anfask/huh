export const dynamic = "force-dynamic";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { markMultipleAnnouncementsAsViewed } from "@/lib/actions";
import { Announcement, Class, Prisma } from "@prisma/client";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

type AnnouncementList = Announcement & {
  class: Class | null;
  views: { userId: string }[];
};

const AnnouncementListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  // Await the searchParams Promise
  const resolvedSearchParams = await searchParams;

  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string })?.role;
  const currentUserId = userId;

  const columns = [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "Class",
      accessor: "class",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
    },

    ...(role === "admin"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const renderRow = (item: AnnouncementList) => {
    const isViewed = item.views.some((view) => view.userId === currentUserId);

    return (
      <tr
        key={item.id}
        className={`border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight ${
          !isViewed ? "bg-blue-50" : ""
        }`}
      >
        <td className="flex items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            {!isViewed && (
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
            {item.title}
          </div>
        </td>
        <td>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              item.class
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {item.class?.name || "All Classes"}
          </span>
        </td>
        <td className="hidden md:table-cell">
          {new Intl.DateTimeFormat("en-US").format(item.date)}
        </td>

        <td>
          <div className="flex items-center gap-2">
            {role === "admin" && (
              <>
                <FormContainer table="announcement" type="update" data={item} />
                <FormContainer
                  table="announcement"
                  type="delete"
                  id={item.id}
                />
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const { page, markViewed, classFilter, ...queryParams } =
    resolvedSearchParams;
  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION
  const query: Prisma.AnnouncementWhereInput = {};

  // Search condition
  if (queryParams?.search) {
    query.title = {
      contains: queryParams.search,
      mode: "insensitive",
    };
  }

  // Class filter condition (for admin/teacher filtering)
  if (classFilter === "general") {
    query.classId = null;
  } else if (classFilter === "specific") {
    query.classId = { not: null };
  }

  // ROLE CONDITIONS - Updated with correct relationships based on your Prisma models
  switch (role) {
    case "admin":
      // Admin can see all announcements - no additional filtering needed
      break;

    case "teacher":
      // Teachers see:
      // 1. General announcements (classId is null)
      // 2. Classes they supervise (supervisorId)
      // 3. Classes where they teach lessons
      query.OR = [
        { classId: null }, // General announcements for all classes
        {
          class: {
            supervisorId: currentUserId!,
          },
        }, // Classes they supervise
        {
          class: {
            lessons: {
              some: { teacherId: currentUserId! },
            },
          },
        }, // Classes where they teach lessons
      ];
      break;

    case "student":
      // Students see:
      // 1. General announcements (classId is null)
      // 2. Announcements for their specific class (direct classId relationship)

      // First, get the student's classId
      const student = await prisma.student.findUnique({
        where: { id: currentUserId! },
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
      // Parents see:
      // 1. General announcements (classId is null)
      // 2. Announcements for their children's classes

      // Get all classIds of the parent's children
      const parentStudents = await prisma.student.findMany({
        where: { parentId: currentUserId! },
        select: { classId: true },
      });

      const childrenClassIds = parentStudents.map((student) => student.classId);

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

  // Handle sorting
  const currentSort = queryParams.sort || "date_desc";
  const orderBy: Prisma.AnnouncementOrderByWithRelationInput = (() => {
    switch (currentSort) {
      case "title_asc":
        return { title: "asc" };
      case "title_desc":
        return { title: "desc" };
      case "date_asc":
        return { date: "asc" };
      case "date_desc":
        return { date: "desc" };
      case "class_asc":
        return { class: { name: "asc" } };
      case "class_desc":
        return { class: { name: "desc" } };
      default:
        return { date: "desc" }; // Default to newest first
    }
  })();

  // First fetch to get announcements that need to be marked as viewed
  if (currentUserId && !markViewed) {
    const unviewedAnnouncements = await prisma.announcement.findMany({
      where: {
        ...query,
        views: {
          none: {
            userId: currentUserId,
          },
        },
      },
      select: {
        id: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    });

    if (unviewedAnnouncements.length > 0) {
      const announcementIds = unviewedAnnouncements.map(
        (announcement) => announcement.id
      );
      await markMultipleAnnouncementsAsViewed(currentUserId, announcementIds);

      // Redirect to mark as viewed to prevent the stale state
      const params = new URLSearchParams(
        resolvedSearchParams as Record<string, string>
      );
      params.set("markViewed", "true");
      redirect(`/list/announcements?${params.toString()}`);
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.announcement.findMany({
      where: query,
      orderBy,
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        views: {
          where: {
            userId: currentUserId!,
          },
          select: {
            userId: true,
          },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.announcement.count({ where: query }),
  ]);

  const getQueryString = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "markViewed") query.set(key, value);
    }
    return query.toString();
  };

  const sortOptions = [
    { value: "date_desc", label: "Newest First" },
    { value: "date_asc", label: "Oldest First" },
    { value: "title_asc", label: "Title A-Z" },
    { value: "title_desc", label: "Title Z-A" },
    { value: "class_asc", label: "Class A-Z" },
    { value: "class_desc", label: "Class Z-A" },
  ];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Announcements
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {/* SORT BUTTON */}
            <div className="relative group">
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow hover:bg-yellow-400 transition-colors">
                <Image src="/sort.png" alt="Sort" width={14} height={14} />
              </button>
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[160px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-1">
                  {sortOptions.map((option) => (
                    <Link
                      key={option.value}
                      href={`/list/announcements?${getQueryString({
                        ...queryParams,
                        sort: option.value,
                      })}`}
                      className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                        currentSort === option.value
                          ? "bg-blue-50 text-blue-600"
                          : ""
                      }`}
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* CLASS FILTER */}
            {(role === "admin" || role === "teacher") && (
              <div className="relative group">
                <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow hover:bg-yellow-400 transition-colors">
                  <Image
                    src="/filter.png"
                    alt="Filter"
                    width={14}
                    height={14}
                  />
                </button>
                <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[150px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-1">
                    <Link
                      href={`/list/announcements?${getQueryString({
                        ...queryParams,
                        classFilter: undefined,
                      })}`}
                      className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                        !classFilter ? "bg-blue-50 text-blue-600" : ""
                      }`}
                    >
                      All Announcements
                    </Link>
                    <Link
                      href={`/list/announcements?${getQueryString({
                        ...queryParams,
                        classFilter: "general",
                      })}`}
                      className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                        classFilter === "general"
                          ? "bg-blue-50 text-blue-600"
                          : ""
                      }`}
                    >
                      General Only
                    </Link>
                    <Link
                      href={`/list/announcements?${getQueryString({
                        ...queryParams,
                        classFilter: "specific",
                      })}`}
                      className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                        classFilter === "specific"
                          ? "bg-blue-50 text-blue-600"
                          : ""
                      }`}
                    >
                      Class-Specific Only
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {role === "admin" && (
              <FormContainer table="announcement" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />

      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default AnnouncementListPage;
