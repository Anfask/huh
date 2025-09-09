
export const dynamic = "force-dynamic";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Event, Prisma } from "@prisma/client";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

type EventList = Event & { class: Class | null };

const EventListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
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
    {
      header: "Start Time",
      accessor: "startTime",
      className: "hidden md:table-cell",
    },
    {
      header: "End Time",
      accessor: "endTime",
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

  const renderRow = (item: EventList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td>
        <span className={`px-2 py-1 text-xs rounded-full ${
          item.class 
            ? "bg-blue-100 text-blue-700" 
            : "bg-green-100 text-green-700"
        }`}>
          {item.class?.name || "All Classes"}
        </span>
      </td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.startTime)}
      </td>
      <td className="hidden md:table-cell">
        {item.startTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </td>
      <td className="hidden md:table-cell">
        {item.endTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="event" type="update" data={item} />
              <FormContainer table="event" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const resolvedSearchParams = await searchParams;
  const { page, classFilter, ...queryParams } = resolvedSearchParams;
  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION
  const query: Prisma.EventWhereInput = {};

  // Search condition
  if (queryParams?.search) {
    query.title = {
      contains: queryParams.search,
      mode: "insensitive",
    };
  }

  // Class filter condition (for admin/teacher filtering)
  if (classFilter === 'general') {
    query.classId = null;
  } else if (classFilter === 'specific') {
    query.classId = { not: null };
  }

  // ROLE CONDITIONS - Updated with correct relationships based on your Prisma models
  switch (role) {
    case "admin":
      // Admin can see all events - no additional filtering needed
      break;
    
    case "teacher":
      // Teachers see:
      // 1. General events (classId is null)
      // 2. Events for classes they supervise (supervisorId)
      // 3. Events for classes where they teach lessons
      query.OR = [
        { classId: null }, // General events for all classes
        { 
          class: { 
            supervisorId: currentUserId! 
          } 
        }, // Classes they supervise
        {
          class: {
            lessons: { 
              some: { teacherId: currentUserId! } 
            },
          },
        }, // Classes where they teach lessons
      ];
      break;
    
    case "student":
      // Students see:
      // 1. General events (classId is null) 
      // 2. Events for their specific class (direct classId relationship)
      
      // First, get the student's classId
      const student = await prisma.student.findUnique({
        where: { id: currentUserId! },
        select: { classId: true }
      });

      if (student) {
        query.OR = [
          { classId: null }, // General events for all classes
          { classId: student.classId }, // Events for their specific class
        ];
      } else {
        // If student not found, only show general events
        query.classId = null;
      }
      break;
    
    case "parent":
      // Parents see:
      // 1. General events (classId is null)
      // 2. Events for their children's classes
      
      // Get all classIds of the parent's children
      const parentStudents = await prisma.student.findMany({
        where: { parentId: currentUserId! },
        select: { classId: true }
      });

      const childrenClassIds = parentStudents.map(student => student.classId);

      if (childrenClassIds.length > 0) {
        query.OR = [
          { classId: null }, // General events for all classes
          { classId: { in: childrenClassIds } }, // Events for children's classes
        ];
      } else {
        // If no children found, only show general events
        query.classId = null;
      }
      break;
    
    default:
      // If no role or unknown role, only show general events
      query.classId = null;
      break;
  }

  // Handle sorting
  const currentSort = queryParams.sort || "startTime_asc";
  const orderBy: Prisma.EventOrderByWithRelationInput = (() => {
    switch (currentSort) {
      case "title_asc":
        return { title: "asc" };
      case "title_desc":
        return { title: "desc" };
      case "startTime_asc":
        return { startTime: "asc" };
      case "startTime_desc":
        return { startTime: "desc" };
      case "class_asc":
        return { class: { name: "asc" } };
      case "class_desc":
        return { class: { name: "desc" } };
      default:
        return { startTime: "asc" }; // Default to upcoming events first
    }
  })();

  const getQueryString = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    return query.toString();
  };

  const sortOptions = [
    { value: "startTime_asc", label: "Upcoming First" },
    { value: "startTime_desc", label: "Latest First" },
    { value: "title_asc", label: "Title A-Z" },
    { value: "title_desc", label: "Title Z-A" },
    { value: "class_asc", label: "Class A-Z" },
    { value: "class_desc", label: "Class Z-A" },
  ];

  try {
    const [data, count] = await prisma.$transaction([
      prisma.event.findMany({
        where: query,
        orderBy,
        include: {
          class: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: ITEM_PER_PAGE,
        skip: ITEM_PER_PAGE * (p - 1),
      }),
      prisma.event.count({ where: query }),
    ]);

    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        {/* TOP */}
        <div className="flex items-center justify-between">
          <h1 className="hidden md:block text-lg font-semibold">
            All Events ({count})
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
                        href={`/list/events?${getQueryString({
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
                    <Image src="/filter.png" alt="Filter" width={14} height={14} />
                  </button>
                  <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[150px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-1">
                      <Link
                        href={`/list/events?${getQueryString({
                          ...queryParams,
                          classFilter: undefined,
                        })}`}
                        className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                          !classFilter ? "bg-blue-50 text-blue-600" : ""
                        }`}
                      >
                        All Events
                      </Link>
                      <Link
                        href={`/list/events?${getQueryString({
                          ...queryParams,
                          classFilter: 'general',
                        })}`}
                        className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                          classFilter === 'general' ? "bg-blue-50 text-blue-600" : ""
                        }`}
                      >
                        General Only
                      </Link>
                      <Link
                        href={`/list/events?${getQueryString({
                          ...queryParams,
                          classFilter: 'specific',
                        })}`}
                        className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                          classFilter === 'specific' ? "bg-blue-50 text-blue-600" : ""
                        }`}
                      >
                        Class-Specific Only
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {role === "admin" && (
                <FormContainer table="event" type="create" />
              )}
            </div>
          </div>
        </div>

        {/* LIST */}
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No events found.{" "}
            {role !== "admin" &&
              "You may not have access to view events, or there are no events in your classes."}
          </div>
        ) : (
          <Table columns={columns} renderRow={renderRow} data={data} />
        )}

        {/* PAGINATION */}
        {count > 0 && <Pagination page={p} count={count} />}
      </div>
    );
  } catch (error) {
    console.error("Error fetching events:", error);
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="text-center py-8 text-red-500">
          Error loading events. Please check the console for details.
        </div>
      </div>
    );
  }
};

export default EventListPage;