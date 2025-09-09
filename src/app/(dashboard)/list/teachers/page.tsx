export const dynamic = "force-dynamic";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import type { Class, Prisma, Subject, Teacher } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth, currentUser } from "@clerk/nextjs/server";

// Server component
// --- Types ---
type TeacherList = Teacher & { subjects: Subject[] } & { classes: Class[] };

const TeacherListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const user = await currentUser();
  const role = user?.publicMetadata.role as string;

  const columns = [
    { header: "Info", accessor: "info" },
    {
      header: "Teacher ID",
      accessor: "teacherId",
      className: "hidden md:table-cell",
    },
    {
      header: "Subjects",
      accessor: "subjects",
      className: "hidden md:table-cell",
    },
    {
      header: "Classes",
      accessor: "classes",
      className: "hidden md:table-cell",
    },
    { header: "Phone", accessor: "phone", className: "hidden lg:table-cell" },
    {
      header: "Address",
      accessor: "address",
      className: "hidden lg:table-cell",
    },
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  const renderRow = (item: TeacherList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src={item.img || "/noAvatar.png"}
          alt=""
          width={40}
          height={40}
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-xs text-gray-500">{item?.email}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.username}</td>
      <td className="hidden md:table-cell">
        {item.subjects.map((subject) => subject.name).join(", ")}
      </td>
      <td className="hidden md:table-cell">
        {item.classes.map((classItem) => classItem.name).join(", ")}
      </td>
      <td className="hidden lg:table-cell">{item.phone}</td>
      <td className="hidden lg:table-cell">{item.address}</td>
      <td>
        <div className="flex items-center gap-2">
          <Link href={`/list/teachers/${item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky">
              <Image src="/view.png" alt="" width={16} height={16} />
            </button>
          </Link>
          {role === "admin" && (
            <>
              <FormContainer table="teacher" type="update" data={item} />
              <FormContainer table="teacher" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );
  const resolvedSearchParams = await searchParams;

  const { page, ...queryParams } = resolvedSearchParams;

  const p = page ? Number.parseInt(page) : 1;

  // Build query based on search parameters
  const query: Prisma.TeacherWhereInput = {};
  const orderBy: Prisma.TeacherOrderByWithRelationInput[] = [];

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.lessons = {
              some: { classId: Number.parseInt(value) },
            };
            break;
          case "subjectId":
            query.subjects = {
              some: { id: Number.parseInt(value) },
            };
            break;
          case "search":
            query.OR = [
              { name: { contains: value, mode: "insensitive" } },
              { email: { contains: value, mode: "insensitive" } },
              { username: { contains: value, mode: "insensitive" } },
            ];
            break;
          case "sort":
            if (value === "name_asc") orderBy.push({ name: "asc" });
            if (value === "name_desc") orderBy.push({ name: "desc" });
            if (value === "email_asc") orderBy.push({ email: "asc" });
            if (value === "email_desc") orderBy.push({ email: "desc" });
            if (value === "created_asc") orderBy.push({ createdAt: "asc" });
            if (value === "created_desc") orderBy.push({ createdAt: "desc" });
            break;
          default:
            break;
        }
      }
    }
  }

  // Default sorting if none specified
  if (orderBy.length === 0) {
    orderBy.push({ name: "asc" });
  }

  const [data, count] = await prisma.$transaction([
    prisma.teacher.findMany({
      where: query,
      orderBy,
      include: {
        subjects: true,
        classes: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.teacher.count({ where: query }),
  ]);

  // Get subjects and classes for filters
  const subjects = await prisma.subject.findMany();
  const classes = await prisma.class.findMany();

  const getQueryString = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    return query.toString();
  };

  const currentSort = queryParams.sort || "name_asc";
  const getSortOptions = () => {
    const options = [
      { value: "name_asc", label: "Name A-Z" },
      { value: "name_desc", label: "Name Z-A" },
      { value: "email_asc", label: "Email A-Z" },
      { value: "email_desc", label: "Email Z-A" },
      { value: "created_asc", label: "Oldest First" },
      { value: "created_desc", label: "Newest First" },
    ];
    return options.find((opt) => opt.value !== currentSort) || options[1];
  };

  const nextSortOption = getSortOptions();

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Teachers</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {/* Sort Dropdown */}
            <div className="relative group">
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow hover:bg-yellow-400 transition-colors">
                <Image src="/sort.png" alt="Sort" width={14} height={14} />
              </button>
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[150px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-1">
                  <Link
                    href={`/list/teachers?${getQueryString({
                      ...queryParams,
                      sort: "name_asc",
                    })}`}
                    className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                      currentSort === "name_asc"
                        ? "bg-blue-50 text-blue-600"
                        : ""
                    }`}
                  >
                    Name A-Z
                  </Link>
                  <Link
                    href={`/list/teachers?${getQueryString({
                      ...queryParams,
                      sort: "name_desc",
                    })}`}
                    className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                      currentSort === "name_desc"
                        ? "bg-blue-50 text-blue-600"
                        : ""
                    }`}
                  >
                    Name Z-A
                  </Link>
                  <Link
                    href={`/list/teachers?${getQueryString({
                      ...queryParams,
                      sort: "email_asc",
                    })}`}
                    className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                      currentSort === "email_asc"
                        ? "bg-blue-50 text-blue-600"
                        : ""
                    }`}
                  >
                    Email A-Z
                  </Link>
                  <Link
                    href={`/list/teachers?${getQueryString({
                      ...queryParams,
                      sort: "email_desc",
                    })}`}
                    className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                      currentSort === "email_desc"
                        ? "bg-blue-50 text-blue-600"
                        : ""
                    }`}
                  >
                    Email Z-A
                  </Link>
                  <Link
                    href={`/list/teachers?${getQueryString({
                      ...queryParams,
                      sort: "created_desc",
                    })}`}
                    className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                      currentSort === "created_desc"
                        ? "bg-blue-50 text-blue-600"
                        : ""
                    }`}
                  >
                    Newest First
                  </Link>
                  <Link
                    href={`/list/teachers?${getQueryString({
                      ...queryParams,
                      sort: "created_asc",
                    })}`}
                    className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                      currentSort === "created_asc"
                        ? "bg-blue-50 text-blue-600"
                        : ""
                    }`}
                  >
                    Oldest First
                  </Link>
                </div>
              </div>
            </div>

            {/* Filter Dropdown */}
            <div className="relative group">
              <button
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  queryParams.subjectId || queryParams.classId
                    ? "bg-blue-500 text-white"
                    : "bg-lamaYellow hover:bg-yellow-400"
                }`}
              >
                <Image src="/filter.png" alt="Filter" width={14} height={14} />
              </button>
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-1">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Filter by Subject
                  </div>
                  <Link
                    href={`/list/teachers?${getQueryString({
                      ...queryParams,
                      subjectId: undefined,
                    })}`}
                    className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                      !queryParams.subjectId ? "bg-blue-50 text-blue-600" : ""
                    }`}
                  >
                    All Subjects
                  </Link>
                  {subjects.map((subject) => (
                    <Link
                      key={subject.id}
                      href={`/list/teachers?${getQueryString({
                        ...queryParams,
                        subjectId: subject.id.toString(),
                      })}`}
                      className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                        queryParams.subjectId === subject.id.toString()
                          ? "bg-blue-50 text-blue-600"
                          : ""
                      }`}
                    >
                      {subject.name}
                    </Link>
                  ))}

                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Filter by Class
                    </div>
                    <Link
                      href={`/list/teachers?${getQueryString({
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
                        href={`/list/teachers?${getQueryString({
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
                  </div>
                </div>
              </div>
            </div>

            {/* Add Teacher Button */}
            {role === "admin" && (
              <FormContainer table="teacher" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {(queryParams.subjectId || queryParams.classId || queryParams.search) && (
        <div className="flex items-center gap-2 mt-4 mb-4">
          <span className="text-sm text-gray-500">Active filters:</span>
          {queryParams.search && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Search: {queryParams.search}
              <Link
                href={`/list/teachers?${getQueryString({
                  ...queryParams,
                  search: undefined,
                })}`}
              >
                <button className="ml-1 text-blue-600 hover:text-blue-800">
                  ×
                </button>
              </Link>
            </span>
          )}
          {queryParams.subjectId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Subject:{" "}
              {
                subjects.find((s) => s.id.toString() === queryParams.subjectId)
                  ?.name
              }
              <Link
                href={`/list/teachers?${getQueryString({
                  ...queryParams,
                  subjectId: undefined,
                })}`}
              >
                <button className="ml-1 text-green-600 hover:text-green-800">
                  ×
                </button>
              </Link>
            </span>
          )}
          {queryParams.classId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              Class:{" "}
              {
                classes.find((c) => c.id.toString() === queryParams.classId)
                  ?.name
              }
              <Link
                href={`/list/teachers?${getQueryString({
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
          <Link
            href="/list/teachers"
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

export default TeacherListPage;
