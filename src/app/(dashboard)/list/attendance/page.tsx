export const dynamic = "force-dynamic";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Attendance, Prisma, Student } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

type AttendanceList = Attendance & {
  student: Student;
};

const AttendanceListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const resolvedSearchParams = await searchParams;

  const { sessionClaims, userId } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

  // Redirect if not authenticated
  if (!userId || !role) {
    redirect('/sign-in');
  }

  const { page, ...queryParams } = resolvedSearchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.AttendanceWhereInput = {};

  const showAllRecords = queryParams.showAll === "true";

  // Role-based filtering
  if (role === "student") {
    // Students can only see their own attendance
    const student = await prisma.student.findUnique({
      where: { id: userId },
    });
    
    if (!student) {
      redirect('/dashboard');
    }
    
    query.studentId = student.id;
  } else if (role === "parent") {
    // Parents can only see their children's attendance
    const parent = await prisma.parent.findUnique({
      where: { id: userId },
      include: { students: true },
    });
    
    if (!parent || parent.students.length === 0) {
      redirect('/dashboard');
    }
    
    query.studentId = {
      in: parent.students.map(student => student.id),
    };
  } else if (role === "teacher") {
  const teacher = await prisma.teacher.findUnique({
    where: { id: userId },
    include: { 
      classes: true // Teachers can be supervisors of classes
    },
  });
  
  if (!teacher) {
    redirect('/dashboard');
  }
  
  // Get class IDs where this teacher is a supervisor
  const classIds = teacher.classes.map(cls => cls.id);
  
  if (classIds.length === 0) {
    query.student = {
      classId: { in: [] }
    };
  } else {
    query.student = {
      classId: { in: classIds }
    };
  }
}
  // Admin can see all records (no additional filtering needed)

  // Apply search and filter parameters
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            if (query.OR) {
              query.OR.push({ student: { name: { contains: value, mode: "insensitive" } } });
            } else {
              query.OR = [
                { student: { name: { contains: value, mode: "insensitive" } } },
              ];
            }
            break;
          case "present":
            if (value === "true" || value === "false") {
              query.present = value === "true";
            }
            break;
          case "date":
            if (value) {
              const selectedDate = new Date(value);
              const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
              const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
              query.date = {
                gte: startOfDay,
                lte: endOfDay,
              };
            }
            break;
          case "showAll":
            break;
          default:
            break;
        }
      }
    }
  }

  // Default to today's records if no specific filters are applied
  if (
    !showAllRecords &&
    !queryParams.date &&
    !queryParams.search &&
    !queryParams.present
  ) {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    query.date = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  const currentSort =
    queryParams.sort ||
    (showAllRecords || queryParams.search || queryParams.present
      ? "date_desc"
      : "present_desc");

  const orderBy: Prisma.Enumerable<Prisma.AttendanceOrderByWithRelationInput> = (() => {
    switch (currentSort) {
      case "date_asc":
        return { date: "asc" };
      case "date_desc":
        return { date: "desc" };
      case "student_asc":
        return { student: { name: "asc" } };
      case "student_desc":
        return { student: { name: "desc" } };
      case "present_asc":
        return [{ present: "asc" }, { student: { name: "asc" } }];
      case "present_desc":
        return [{ present: "desc" }, { student: { name: "asc" } }];
      default:
        return showAllRecords || queryParams.search || queryParams.present
          ? { date: "desc" }
          : [{ present: "desc" }, { student: { name: "asc" } }];
    }
  })();

  const [data, count] = await prisma.$transaction([
    prisma.attendance.findMany({
      where: query,
      orderBy,
      include: {
        student: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.attendance.count({ where: query }),
  ]);

  // Dynamic columns based on role
  const columns = [
    { header: "Student", accessor: "student" },
    ...(role === "admin" || role === "teacher" 
      ? [{ header: "Class", accessor: "class", className: "hidden lg:table-cell text-center" }] 
      : []),
    { header: "Date", accessor: "date", className: "hidden lg:table-cell" },
    { header: "Status", accessor: "present" },
    ...(role === "admin" || role === "teacher"
      ? [{ header: "Actions", accessor: "action" }]
      : []),
  ];

  const renderRow = (item: AttendanceList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.student.name}</h3>
          <p className="text-xs text-gray-500 hidden lg:table-cell">{item.student.email}</p>
        </div>
      </td>
      {(role === "admin" || role === "teacher") && (
        <td className="hidden lg:table-cell text-center">{item.student.classId}</td>
      )}
      <td className="hidden lg:table-cell">
        {new Date(item.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </td>
      <td>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.present
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {item.present ? "Present" : "Absent"}
        </span>
      </td>
      {(role === "admin" || role === "teacher") && (
        <td>
          <div className="flex items-center gap-2">
            <FormContainer table="attendance" type="update" data={item} />
            <FormContainer table="attendance" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  const getQueryString = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    return query.toString();
  };

  const sortOptions = [
    { value: "present_desc", label: "Present First" },
    { value: "present_asc", label: "Absent First" },
    { value: "student_asc", label: "Student A-Z" },
    { value: "student_desc", label: "Student Z-A" },
    { value: "date_asc", label: "Oldest First" },
    { value: "date_desc", label: "Latest First" },
  ];

  const attendanceStats = {
    total: count,
    present: data.filter((item) => item.present).length,
    absent: data.filter((item) => !item.present).length,
    presentPercentage:
      count > 0
        ? ((data.filter((item) => item.present).length / data.length) * 100).toFixed(1)
        : 0,
  };

  const isToday =
    !showAllRecords &&
    !queryParams.date &&
    !queryParams.search &&
    !queryParams.present;
  const isYesterday =
    queryParams.date ===
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const isSpecificDate =
    queryParams.date &&
    !isYesterday &&
    queryParams.date !== new Date().toISOString().split("T")[0];

  // Role-based titles
  const getPageTitle = () => {
    switch (role) {
      case "student":
        return isToday
          ? "My Today's Attendance"
          : isYesterday
          ? "My Yesterday's Attendance"
          : showAllRecords
          ? "My Attendance Records"
          : "My Attendance Records";
      case "parent":
        return isToday
          ? "Children's Today's Attendance"
          : isYesterday
          ? "Children's Yesterday's Attendance"
          : showAllRecords
          ? "Children's Attendance Records"
          : "Children's Attendance Records";
      case "teacher":
        return isToday
          ? "Class Attendance Today"
          : isYesterday
          ? "Class Attendance Yesterday"
          : showAllRecords
          ? "Class Attendance Records"
          : "Class Attendance Records";
      default:
        return isToday
          ? "Today's Attendance"
          : isYesterday
          ? "Yesterday's Attendance"
          : showAllRecords
          ? "All Attendance Records"
          : "Attendance Records";
    }
  };

  const getPageDescription = () => {
    switch (role) {
      case "student":
        return isToday
          ? `Your attendance for today - ${new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}`
          : isYesterday
          ? "Your attendance record from yesterday"
          : isSpecificDate
          ? `Your attendance for ${new Date(queryParams.date!).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}`
          : showAllRecords
          ? "Your complete attendance history"
          : "Your filtered attendance records";
      case "parent":
        return isToday
          ? `Your children's attendance for today`
          : isYesterday
          ? "Your children's attendance from yesterday"
          : isSpecificDate
          ? `Your children's attendance for ${new Date(queryParams.date!).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}`
          : showAllRecords
          ? "Complete attendance history for your children"
          : "Filtered attendance records for your children";
      case "teacher":
        return isToday
          ? `Attendance for your assigned classes today`
          : isYesterday
          ? "Yesterday's attendance for your classes"
          : isSpecificDate
          ? `Class attendance for ${new Date(queryParams.date!).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}`
          : showAllRecords
          ? "Complete attendance records for your classes"
          : "Filtered attendance records for your classes";
      default:
        return isToday
          ? `Track today's attendance - ${new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}`
          : isYesterday
          ? "Yesterday's attendance records"
          : isSpecificDate
          ? `Attendance for ${new Date(queryParams.date!).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}`
          : showAllRecords
          ? "All attendance records from all dates"
          : "Filtered attendance records";
    }
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <h1 className="hidden md:block text-lg font-semibold">
            {getPageTitle()}
          </h1>
          <p className="text-sm text-gray-500">
            {getPageDescription()}
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {(role === "admin" || role === "teacher" || role === "parent") && <TableSearch />}
          <div className="flex items-center gap-4 self-end">
            <div className="relative group">
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow hover:bg-yellow-400 transition-colors">
                <Image src="/sort.png" alt="Sort" width={14} height={14} />
              </button>
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[160px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-1">
                  {sortOptions.map((option) => (
                    <Link
                      key={option.value}
                      href={`/list/attendance?${getQueryString({
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

            <div className="relative group">
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow hover:bg-yellow-400 transition-colors">
                <Image src="/filter.png" alt="Filter" width={14} height={14} />
              </button>
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-2 px-3">
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Date Filter
                    </label>
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/list/attendance?${getQueryString({
                          search: queryParams.search,
                          sort: queryParams.sort,
                          present: queryParams.present,
                          date: new Date().toISOString().split("T")[0],
                        })}`}
                        className={`px-3 py-2 text-xs rounded font-medium ${
                          isToday
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 hover:bg-blue-50 text-gray-700"
                        }`}
                      >
                         Today&apos;s Attendance
                      </Link>
                      <Link
                        href={`/list/attendance?${getQueryString({
                          search: queryParams.search,
                          sort: queryParams.sort,
                          present: queryParams.present,
                          date: new Date(Date.now() - 24 * 60 * 60 * 1000)
                            .toISOString()
                            .split("T")[0],
                        })}`}
                        className={`px-3 py-2 text-xs rounded font-medium ${
                          isYesterday
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 hover:bg-blue-50 text-gray-700"
                        }`}
                      >
                         Yesterday&apos;s Attendance
                      </Link>
                      <Link
                        href={`/list/attendance?${getQueryString({
                          search: queryParams.search,
                          sort: queryParams.sort,
                          present: queryParams.present,
                          showAll: "true",
                        })}`}
                        className={`px-3 py-2 text-xs rounded font-medium ${
                          showAllRecords
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                         All Records
                      </Link>

                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                           Select Specific Date:
                        </label>
                        <form
                          method="GET"
                          action="/list/attendance"
                          className="flex gap-1"
                        >
                          {queryParams.search && (
                            <input
                              type="hidden"
                              name="search"
                              value={queryParams.search}
                            />
                          )}
                          {queryParams.sort && (
                            <input
                              type="hidden"
                              name="sort"
                              value={queryParams.sort}
                            />
                          )}
                          {queryParams.present && (
                            <input
                              type="hidden"
                              name="present"
                              value={queryParams.present}
                            />
                          )}
                          <input
                            type="date"
                            name="date"
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            defaultValue={queryParams.date}
                            max={new Date().toISOString().split("T")[0]}
                          />
                          <button
                            type="submit"
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            Go
                          </button>
                        </form>
                        {isSpecificDate && (
                          <p className="text-xs text-blue-600 mt-1">
                             Showing:{" "}
                            {new Date(queryParams.date!).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-2 border-t pt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Attendance Status
                    </label>
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/list/attendance?${getQueryString({
                          ...queryParams,
                          present: "true",
                        })}`}
                        className={`px-3 py-2 text-xs rounded font-medium ${
                          queryParams.present === "true"
                            ? "bg-green-500 text-white"
                            : "bg-green-50 hover:bg-green-100 text-green-700"
                        }`}
                      >
                         Present Only
                      </Link>
                      <Link
                        href={`/list/attendance?${getQueryString({
                          ...queryParams,
                          present: "false",
                        })}`}
                        className={`px-3 py-2 text-xs rounded font-medium ${
                          queryParams.present === "false"
                            ? "bg-red-500 text-white"
                            : "bg-red-50 hover:bg-red-100 text-red-700"
                        }`}
                      >
                         Absent Only
                      </Link>
                    </div>
                  </div>

                  {(queryParams.present || queryParams.date || showAllRecords) && (
                    <div className="border-t pt-2">
                      <Link
                        href="/list/attendance"
                        className="block text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-2 rounded hover:bg-blue-50"
                      >
                        🔄 Clear All Filters
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {role === "admin" && (
              <FormContainer table="attendance" type="create" />
            )}

            {role === "teacher" && (
              <FormContainer table="teacherAttendance" type="create" />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800">Total Records</h3>
          <p className="text-2xl font-bold text-blue-900">
            {attendanceStats.total}
          </p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <h3 className="text-sm font-medium text-green-800">Present</h3>
          <p className="text-2xl font-bold text-green-900">
            {attendanceStats.present}
          </p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <h3 className="text-sm font-medium text-red-800">Absent</h3>
          <p className="text-2xl font-bold text-red-900">
            {attendanceStats.absent}
          </p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800">
            Attendance Rate
          </h3>
          <p className="text-2xl font-bold text-yellow-900">
            {attendanceStats.presentPercentage}%
          </p>
        </div>
      </div>

      <Table columns={columns} renderRow={renderRow} data={data} />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default AttendanceListPage;