export const dynamic = "force-dynamic";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Lesson, Prisma, Subject, Teacher } from "@prisma/client";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

type LessonList = Lesson & { subject: Subject } & { class: Class } & {
  teacher: Teacher;
};

const LessonListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { sessionClaims, userId } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

  const columns = [
    {
      header: "Lessons",
      accessor: "",
    },
    {
      header: "Subject Name",
      accessor: "name",
    },
    {
      header: "Class",
      accessor: "class",
    },
    {
      header: "Teacher",
      accessor: "teacher",
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

  const renderRow = (item: LessonList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="">{item.name}</td>
      <td className="flex items-center gap-4 p-4">{item.subject.name}</td>
      <td>{item.class.name}</td>
      <td className="hidden md:table-cell">
        {item.teacher.name + " " + item.teacher.surname}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="lesson" type="update" data={item} />
              <FormContainer table="lesson" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );
  const resolvedSearchParams = await searchParams;

  const { page, ...queryParams } = resolvedSearchParams;

  const p = page ? parseInt(page) : 1;

  // Base query
  const query: Prisma.LessonWhereInput = {};

  // Role-based filtering
  if (role === "teacher") {
    query.teacherId = userId!; // Only show lessons taught by this teacher
  }

  // URL PARAMS CONDITION
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            // For teachers, ensure the class filter is combined with their teaching constraint
            if (role === "teacher") {
              query.AND = [
                { teacherId: userId! },
                { classId: parseInt(value) }
              ];
            } else {
              query.classId = parseInt(value);
            }
            break;
          case "teacherId":
            // Only allow teacherId filter for admins
            if (role === "admin") {
              query.teacherId = value;
            }
            break;
          case "search":
            query.OR = [
              { subject: { name: { contains: value, mode: "insensitive" } } },
              { teacher: { name: { contains: value, mode: "insensitive" } } },
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  // Handle sorting
  const currentSort = queryParams.sort || "name_asc";
  const orderBy: Prisma.LessonOrderByWithRelationInput = (() => {
    switch (currentSort) {
      case "name_asc":
        return { name: "asc" };
      case "name_desc":
        return { name: "desc" };
      default:
        return { name: "asc" };
    }
  })();

  const [data, count] = await prisma.$transaction([
    prisma.lesson.findMany({
      where: query,
      orderBy,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.lesson.count({ where: query }),
  ]);

  const getQueryString = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    return query.toString();
  };
  
  const sortOptions = [
    { value: "name_asc", label: "Name A-Z" },
    { value: "name_desc", label: "Name Z-A" },
  ];

  // Get classes and teachers for filters (admin only)
  const classes = await prisma.class.findMany();
  const teachers = role === "admin" ? await prisma.teacher.findMany() : [];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {role === "teacher" ? "My Lessons" : "All Lessons"}
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
                      href={`/list/lessons?${getQueryString({
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

            {/* FILTER Dropdown */}
            {role === "admin" && (
              <div className="relative group">
                <button
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                    queryParams.classId || queryParams.teacherId
                      ? "bg-blue-500 text-white"
                      : "bg-lamaYellow hover:bg-yellow-400"
                  }`}
                >
                  <Image src="/filter.png" alt="Filter" width={14} height={14} />
                </button>
                <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-1">
                    {/* Class Filter */}
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Filter by Class
                    </div>
                    <Link
                      href={`/list/lessons?${getQueryString({
                        ...queryParams,
                        classId: undefined,
                      })}`}
                      className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                        !queryParams.classId ? "bg-blue-50 text-blue-600" : ""
                      }`}
                    >
                      All Classes
                    </Link>
                    {classes.map((classItem) => (
                      <Link
                        key={classItem.id}
                        href={`/list/lessons?${getQueryString({
                          ...queryParams,
                          classId: classItem.id.toString(),
                        })}`}
                        className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                          queryParams.classId === classItem.id.toString()
                            ? "bg-blue-50 text-blue-600"
                            : ""
                        }`}
                      >
                        {classItem.name}
                      </Link>
                    ))}

                    {/* Teacher Filter (admin only) */}
                    {role === "admin" && (
                      <>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase mt-2">
                          Filter by Teacher
                        </div>
                        <Link
                          href={`/list/lessons?${getQueryString({
                            ...queryParams,
                            teacherId: undefined,
                          })}`}
                          className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                            !queryParams.teacherId
                              ? "bg-blue-50 text-blue-600"
                              : ""
                          }`}
                        >
                          All Teachers
                        </Link>
                        {teachers.map((teacher) => (
                          <Link
                            key={teacher.id}
                            href={`/list/lessons?${getQueryString({
                              ...queryParams,
                              teacherId: teacher.id,
                            })}`}
                            className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                              queryParams.teacherId === teacher.id
                                ? "bg-blue-50 text-blue-600"
                                : ""
                            }`}
                          >
                            {teacher.name} {teacher.surname}
                          </Link>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Add Button */}
            {(role === "admin" || role === "teacher") && (
              <FormContainer table="lesson" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {(queryParams.classId || queryParams.teacherId) && (
        <div className="flex items-center gap-2 mt-4 mb-4">
          <span className="text-sm text-gray-500">Active filters:</span>
          {queryParams.classId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              Class:{" "}
              {
                classes.find((c) => c.id.toString() === queryParams.classId)
                  ?.name
              }
              <Link
                href={`/list/lessons?${getQueryString({
                  ...queryParams,
                  classId: undefined,
                })}`}
              >
                <button className="ml-1 text-purple-600 hover:text-purple-800">
                  ×
                </button>
              </Link>
            </span>
          )}
          {queryParams.teacherId && role === "admin" && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              Teacher:{" "}
              {
                teachers.find((t) => t.id === queryParams.teacherId)?.name
              }{" "}
              {teachers.find((t) => t.id === queryParams.teacherId)?.surname}
              <Link
                href={`/list/lessons?${getQueryString({
                  ...queryParams,
                  teacherId: undefined,
                })}`}
              >
                <button className="ml-1 text-purple-600 hover:text-purple-800">
                  ×
                </button>
              </Link>
            </span>
          )}
          <Link
            href="/list/lessons"
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear all
          </Link>
        </div>
      )}

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default LessonListPage;