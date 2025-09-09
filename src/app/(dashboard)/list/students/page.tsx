export const dynamic = "force-dynamic";
// IMPORTS
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";

import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Grade, Prisma, Student } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

// TYPES
type StudentList = Student & { class: Class & { grade: Grade } };

// COMPONENT
const StudentListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { sessionClaims, userId } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

  const columns = [
    { header: "Info", accessor: "info" },
    { header: "Roll Number", accessor: "rollNo", className: "hidden lg:table-cell  text-center", },
    {
      header: "Student ID",
      accessor: "studentId",
      className: "hidden md:table-cell",
    },
    { header: "Grade", accessor: "grade", className: "hidden md:table-cell text-center" },
    { header: "Phone", accessor: "phone", className: "hidden lg:table-cell text-center" },
    {
      header: "Address",
      accessor: "address",
      className: "hidden lg:table-cell",
    },
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  const renderRow = (item: StudentList) => (
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
          <p className="text-xs text-gray-500">{item.class.name}</p>
        </div>
      </td>
      <td className="hidden lg:table-cell text-center">{item.rollNo}</td>
      <td className="hidden md:table-cell">{item.username}</td>
      <td className="hidden md:table-cell text-center">{item.class.grade.level}</td>
      <td className="hidden lg:table-cell text-center">{item.phone}</td>
      <td className="hidden lg:table-cell">{item.address}</td>
      <td>
        <div className="flex items-center gap-2">
          <Link href={`/list/students/${item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky">
              <Image src="/view.png" alt="" width={16} height={16} />
            </button>
          </Link>
          {(role === "admin" || role === "teacher") && (
            <>
              <FormContainer table="student" type="update" data={item} />
              <FormContainer table="student" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const resolvedSearchParams = await searchParams;

  const { page, ...queryParams } = resolvedSearchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.StudentWhereInput = {};

  // Role-based filtering - if teacher, only show their students
  if (role === "teacher") {
    query.class = {
      supervisorId: userId!, // Use the current teacher's ID as supervisor
    };
  }

  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined) {
      switch (key) {
        case "teacherId":
          // Only allow teacherId filter for admins
          if (role === "admin") {
            query.class = {
              supervisorId: value,
            };
          }
          break;
        case "search":
          query.name = { contains: value, mode: "insensitive" };
          break;
        case "classId":
          // For teachers, ensure the class filter is combined with their teaching constraint
          if (role === "teacher") {
            query.AND = [
              {
                class: {
                  supervisorId: userId!,
                },
              },
              {
                classId: Number(value),
              },
            ];
            // Remove the base teacher constraint since it's now in AND
            delete query.class;
          } else {
            query.classId = Number(value);
          }
          break;
        case "gradeId":
          query.gradeId = Number(value);
          break;
        default:
          break;
      }
    }
  }

  // SORT LOGIC
  let currentSort = "";
  if (role === "admin") {
    currentSort = queryParams.sort || "created_desc";
  } else if (role === "teacher") {
    currentSort = queryParams.sort || "roll_asc";
  }

  const orderBy: Prisma.StudentOrderByWithRelationInput = (() => {
    switch (currentSort) {
      case "name_asc":
        return { name: "asc" };
      case "name_desc":
        return { name: "desc" };
      case "email_asc":
        return { email: "asc" };
      case "email_desc":
        return { email: "desc" };
      case "roll_asc":
        return { rollNo: "asc" };
      case "roll_desc":
        return { rollNo: "desc" };
      case "grade_asc":
        return { grade: { level: "asc" } };
      case "grade_desc":
        return { grade: { level: "desc" } };
      case "created_asc":
        return { createdAt: "asc" };
      case "created_desc":
        return { createdAt: "desc" };
      default:
        return { name: "asc" };
    }
  })();

  const [data, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      orderBy,
      include: { 
        class: {
          include: {
            grade: true
          }
        }
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.student.count({ where: query }),
  ]);

  const classes = await prisma.class.findMany({
    include: {
      grade: true
    }
  });

  const grades = await prisma.grade.findMany({
    orderBy: { level: "asc" }
  });

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
    { value: "email_asc", label: "Email A-Z" },
    { value: "email_desc", label: "Email Z-A" },
    { value: "roll_asc", label: "Roll Number Asc" },
    { value: "roll_desc", label: "Roll Number Desc" },
    { value: "grade_asc", label: "Grade Low-High" },
    { value: "grade_desc", label: "Grade High-Low" },
    { value: "created_asc", label: "Oldest First" },
    { value: "created_desc", label: "Newest First" },
  ];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {role === "teacher" ? "My Students" : "All Students"}
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {/* Sort Dropdown */}
            <div className="relative group">
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow hover:bg-yellow-400 transition-colors">
                <Image src="/sort.png" alt="Sort" width={14} height={14} />
              </button>
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[160px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-full">
                <div className="py-1">
                  {sortOptions.map((option) => (
                    <Link
                      key={option.value}
                      href={`/list/students?${getQueryString({
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

            {/* Filter Dropdown */}
            <div className="relative group">
              <button
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  queryParams.classId || queryParams.gradeId
                    ? "bg-blue-500 text-white"
                    : "bg-lamaYellow hover:bg-yellow-400"
                }`}
              >
                <Image src="/filter.png" alt="Filter" width={14} height={14} />
              </button>
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-1">
                  {/* Class Filter Section */}
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Filter by Class
                  </div>
                  <Link
                    href={`/list/students?${getQueryString({
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
                      href={`/list/students?${getQueryString({
                        ...queryParams,
                        classId: classItem.id.toString(),
                      })}`}
                      className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                        queryParams.classId === classItem.id.toString()
                          ? "bg-blue-50 text-blue-600"
                          : ""
                      }`}
                    >
                      {classItem.name} (Grade {classItem.grade.level})
                    </Link>
                  ))}

                  {/* Divider */}
                  <hr className="my-2" />

                  {/* Grade Filter Section */}
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Filter by Grade
                  </div>
                  <Link
                    href={`/list/students?${getQueryString({
                      ...queryParams,
                      gradeId: undefined,
                    })}`}
                    className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                      !queryParams.gradeId ? "bg-blue-50 text-blue-600" : ""
                    }`}
                  >
                    All Grades
                  </Link>
                  {grades.map((grade) => (
                    <Link
                      key={grade.id}
                      href={`/list/students?${getQueryString({
                        ...queryParams,
                        gradeId: grade.id.toString(),
                      })}`}
                      className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                        queryParams.gradeId === grade.id.toString()
                          ? "bg-blue-50 text-blue-600"
                          : ""
                      }`}
                    >
                      Grade {grade.level}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Add Button */}
            {(role === "admin" || role === "teacher") && (
              <FormContainer table="student" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {(queryParams.classId || queryParams.gradeId) && (
        <div className="flex items-center gap-2 mt-4 mb-4">
          <span className="text-sm text-gray-500">Active filters:</span>
          {queryParams.classId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              Class:{" "}
              {classes.find((c) => c.id.toString() === queryParams.classId)?.name}
              <Link
                href={`/list/students?${getQueryString({
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
          {queryParams.gradeId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Grade:{" "}
              {grades.find((g) => g.id.toString() === queryParams.gradeId)?.level}
              <Link
                href={`/list/students?${getQueryString({
                  ...queryParams,
                  gradeId: undefined,
                })}`}
              >
                <button className="ml-1 text-green-600 hover:text-green-800">
                  ×
                </button>
              </Link>
            </span>
          )}
          <Link
            href="/list/students"
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

export default StudentListPage;