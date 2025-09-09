export const dynamic = "force-dynamic";
// IMPORTS
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Fee, Prisma, Student, FeeType } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

// TYPES
type FeeList = Fee & {
  student: Student;
  feeType: FeeType;
};

const FinanceListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const resolvedSearchParams = await searchParams;

  const { sessionClaims, userId } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

  const { page, ...queryParams } = resolvedSearchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.FeeWhereInput = {};

  // Role-based data restrictions
  let allowedStudentIds: string[] = [];

  if (role === "student" && userId) {
    // Students can only see their own fees
    query.studentId = userId;
    allowedStudentIds = [userId];
  } else if (role === "parent" && userId) {
    // Parents can only see their children's fees
    const parent = await prisma.parent.findUnique({
      where: { id: userId },
      include: {
        students: {
          select: { id: true }
        }
      }
    })
    
    if (parent && parent.students.length > 0) {
      const studentIds = parent.students.map(student => student.id);
      allowedStudentIds = studentIds;
      query.studentId = {
        in: studentIds
      };
    } else {
      // If parent has no children, return empty results
      query.studentId = "impossible-id";
      allowedStudentIds = [];
    }
  }  
  else if (role === "teacher" && userId) {
  // Teachers can only see fees for students in their classes
  const classes = await prisma.class.findMany({
    where: { supervisorId: userId },
    include: { students: { select: { id: true } } },
  });

  const studentIds = classes.flatMap(cls => cls.students.map(s => s.id));

  if (studentIds.length > 0) {
    allowedStudentIds = studentIds;
    query.studentId = { in: studentIds };
  } else {
    query.studentId = "impossible-id";
    allowedStudentIds = [];
  }
}

  // Fetch fee types for the filter dropdown
  const feeTypes = await prisma.feeType.findMany({
    orderBy: { name: "asc" },
  });

  // Fetch students for the form (admin/teacher only)
  // const students = (role === "admin" || role === "teacher") ? 
  //   await prisma.student.findMany({
  //     orderBy: { name: "asc" },
  //     select: { id: true, name: true, email: true }
  //   }) : [];

  // Check if we want all records (explicit filter with showAll=true)
  const showAllRecords = queryParams.showAll === "true";

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.OR = [
              { student: { name: { contains: value, mode: "insensitive" } } },
              { feeType: { name: { contains: value, mode: "insensitive" } } },
              { description: { contains: value, mode: "insensitive" } },
            ];
            break;
          case "status":
            if (value === "paid" || value === "pending" || value === "overdue") {
              query.status = value;
            }
            break;
          case "dueDate":
            if (value) {
              const selectedDate = new Date(value);
              const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
              const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
              query.dueDate = {
                gte: startOfDay,
                lte: endOfDay,
              };
            }
            break;
          case "feeTypeId":
            if (value) {
              const requestedFeeTypeId = Number(value);
              query.feeTypeId = requestedFeeTypeId;
            }
            break;
          case "academicYear":
            if (value) {
              query.academicYear = value;
            }
            break;
          case "semester":
            if (value) {
              query.semester = value;
            }
            break;
          case "showAll":
            // Don't apply date filter when showAll is true
            break;
          default:
            break;
        }
      }
    }
  }

  // Apply default filter for current academic year if no explicit filters are set
  // and showAll is not true
  if (
    !showAllRecords &&
    !queryParams.dueDate &&
    !queryParams.search &&
    !queryParams.status &&
    !queryParams.feeTypeId &&
    !queryParams.academicYear &&
    !queryParams.semester
  ) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    // Academic year starts in July (month 6)
    const academicYear = currentMonth >= 6 ? 
      `${currentYear}-${currentYear + 1}` : 
      `${currentYear - 1}-${currentYear}`;
    
    query.academicYear = academicYear;
  }

  // Handle sorting - prioritize by due date and status for current view
  const currentSort =
    queryParams.sort ||
    (showAllRecords ||
    queryParams.search ||
    queryParams.status ||
    queryParams.feeTypeId
      ? "dueDate_desc"
      : "status_pending");

  const orderBy: Prisma.Enumerable<Prisma.FeeOrderByWithRelationInput> = (() => {
    switch (currentSort) {
      case "dueDate_asc":
        return { dueDate: "asc" };
      case "dueDate_desc":
        return { dueDate: "desc" };
      case "student_asc":
        return { student: { name: "asc" } };
      case "student_desc":
        return { student: { name: "desc" } };
      case "feeType_asc":
        return { feeType: { name: "asc" } };
      case "feeType_desc":
        return { feeType: { name: "desc" } };
      case "amount_asc":
        return { amount: "asc" };
      case "amount_desc":
        return { amount: "desc" };
      case "status_pending":
        return [
          { status: "asc" }, // pending comes before paid alphabetically
          { dueDate: "asc" }
        ];
      case "status_paid":
        return [
          { status: "desc" }, // paid comes after pending alphabetically
          { dueDate: "desc" }
        ];
      default:
        return showAllRecords ||
          queryParams.search ||
          queryParams.status ||
          queryParams.feeTypeId
          ? { dueDate: "desc" }
          : [
              { status: "asc" }, // Show pending first
              { dueDate: "asc" }  // Then by due date
            ];
    }
  })();

  const [data, count] = await prisma.$transaction([
    prisma.fee.findMany({
      where: query,
      orderBy,
      include: {
        student: true,
        feeType: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.fee.count({ where: query }),
  ]);

  const columns = [
    { header: "Student", accessor: "student" },
    { header: "Fee Type", accessor: "feeType", className: "hidden md:table-cell" },
    { header: "Amount", accessor: "amount", className: "hidden sm:table-cell text-center" },
    { header: "Due Date", accessor: "dueDate", className: "hidden lg:table-cell" },
    { header: "Status", accessor: "status" },
    ...(role === "admin" || role === "teacher"
      ? [{ header: "Actions", accessor: "action" }]
      : []),
  ];

  const renderRow = (item: FeeList) => {
    const isOverdue = item.status === "pending" && new Date(item.dueDate) < new Date();
    const actualStatus = isOverdue ? "overdue" : item.status;
    
    return (
      <tr
        key={item.id}
        className={`border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-PurpleLight ${
          actualStatus === "overdue" ? "bg-red-50" : ""
        }`}
      >
        <td className="flex items-center gap-4 p-4">
          <div className="flex flex-col">
            <h3 className="font-semibold">{item.student.name}</h3>
            <p className="text-xs text-gray-500">{item.student.email}</p>
          </div>
        </td>
        <td className="hidden md:table-cell">
          <div className="flex flex-col">
            <span className="font-medium">{item.feeType.name}</span>
            {item.description && (
              <span className="text-xs text-gray-500">{item.description}</span>
            )}
          </div>
        </td>
        <td className="hidden sm:table-cell text-center">
          <div className="flex flex-col">
            <span className="font-semibold">₹{item.amount.toLocaleString()}</span>
            {item.paidAmount && item.paidAmount > 0 && (
              <span className="text-xs text-green-600">
                Paid: ₹{item.paidAmount.toLocaleString()}
              </span>
            )}
          </div>
        </td>
        <td className="hidden lg:table-cell">
          <div className="flex flex-col">
            <span className={isOverdue ? "text-red-600 font-medium" : ""}>
              {new Date(item.dueDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="text-xs text-gray-500">
              {item.academicYear} - {item.semester}
            </span>
          </div>
        </td>
        <td>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              actualStatus === "paid"
                ? "bg-green-100 text-green-800"
                : actualStatus === "overdue"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {actualStatus === "paid"
              ? "Paid"
              : actualStatus === "overdue"
              ? "Overdue"
              : "Pending"}
          </span>
          {item.paidDate && (
            <div className="text-xs text-gray-500 mt-1">
              Paid: {new Date(item.paidDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
          )}
        </td>
        <td>
          <div className="flex items-center gap-2">
            {(role === "admin" || role === "teacher") && (
              <>
                <FormContainer 
                  table="fee" 
                  type="update" 
                  data={item} 
                />
                <FormContainer table="fee" type="delete" id={item.id} />
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const getQueryString = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    return query.toString();
  };

  const sortOptions = [
    { value: "status_pending", label: "Pending First" },
    { value: "status_paid", label: "Paid First" },
    { value: "dueDate_asc", label: "Due Date (Earliest)" },
    { value: "dueDate_desc", label: "Due Date (Latest)" },
    { value: "amount_desc", label: "Amount (High to Low)" },
    { value: "amount_asc", label: "Amount (Low to High)" },
    { value: "student_asc", label: "Student A-Z" },
    { value: "student_desc", label: "Student Z-A" },
    { value: "feeType_asc", label: "Fee Type A-Z" },
    { value: "feeType_desc", label: "Fee Type Z-A" },
  ];

  // Calculate statistics
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
  const paidAmount = data.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
  const pendingAmount = totalAmount - paidAmount;
  const overdueCount = data.filter(item => 
    item.status === "pending" && new Date(item.dueDate) < new Date()
  ).length;

  const feeStats = {
    total: count,
    paid: data.filter((item) => item.status === "paid").length,
    pending: data.filter((item) => item.status === "pending").length,
    overdue: overdueCount,
    totalAmount,
    paidAmount,
    pendingAmount,
    collectionRate: totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(1) : 0,
  };

  // Determine the current view for display
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentAcademicYear = currentMonth >= 6 ? 
    `${currentYear}-${currentYear + 1}` : 
    `${currentYear - 1}-${currentYear}`;

  const isCurrentYear = 
    !showAllRecords &&
    !queryParams.dueDate &&
    !queryParams.search &&
    !queryParams.status &&
    !queryParams.feeTypeId &&
    (!queryParams.academicYear || queryParams.academicYear === currentAcademicYear);

  // Show message if user has no accessible data
  if ((role === "parent" && allowedStudentIds.length === 0) ||
      (role === "student" && !userId)) {
    
    let message = "";
    let submessage = "";
    
    if (role === "parent") {
      message = "No Children Found";
      submessage = "No students are linked to your parent account. Please contact your administrator.";
    } else if (role === "student") {
      message = "Access Denied";
      submessage = "Unable to access fee records. Please contact your administrator.";
    }

    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="text-center py-8">
          <div className="mb-4">
            <Image src="/nodata.png" alt="No data" width={64} height={64} className="mx-auto opacity-50" />
          </div>
          <h2 className="text-lg font-semibold text-gray-600 mb-2">{message}</h2>
          <p className="text-gray-500">{submessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <h1 className="hidden md:block text-lg font-semibold">
            {isCurrentYear
              ? role === "parent" ? "Current Year Fees - My Children"
                : role === "student" ? "My Current Year Fees"
                : "Current Academic Year Fees"
              : showAllRecords
              ? role === "parent" ? "All Fee Records - My Children"
                : role === "student" ? "My Fee Records"
                : "All Fee Records"
              : role === "parent" ? "Fee Records - My Children"
                : role === "student" ? "My Fee Records"
                : "Fee Records"}
          </h1>
          <p className="text-sm text-gray-500">
            {isCurrentYear
              ? `Current academic year fees${
                  role === "parent" ? " for your children"
                  : role === "student" ? ""
                  : ""
                } - ${currentAcademicYear}`
              : showAllRecords
              ? `All fee records${
                  role === "parent" ? " for your children"
                  : role === "student" ? ""
                  : ""
                } from all academic years`
              : `Filtered fee records${
                  role === "parent" ? " for your children"
                  : role === "student" ? ""
                  : ""
                }`}
            {queryParams.feeTypeId &&
              ` | Fee Type: ${
                feeTypes.find(
                  (feeType) => feeType.id === Number(queryParams.feeTypeId)
                )?.name
              }`}
            {queryParams.academicYear && ` | Academic Year: ${queryParams.academicYear}`}
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {/* SORT BUTTON */}
            <div className="relative group">
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-Yellow hover:bg-yellow-400 transition-colors">
                <Image src="/sort.png" alt="Sort" width={14} height={14} />
              </button>
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[180px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-1">
                  {sortOptions.map((option) => (
                    <Link
                      key={option.value}
                      href={`/list/finance?${getQueryString({
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

            {/* FILTER BUTTON */}
            <div className="relative group">
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-Yellow hover:bg-yellow-400 transition-colors">
                <Image src="/filter.png" alt="Filter" width={14} height={14} />
              </button>
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[220px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-2 px-3">
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Academic Year Filter
                    </label>
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/list/finance?${getQueryString({
                          search: queryParams.search,
                          sort: queryParams.sort,
                          status: queryParams.status,
                          feeTypeId: queryParams.feeTypeId,
                          academicYear: currentAcademicYear,
                        })}`}
                        className={`px-3 py-2 text-xs rounded font-medium ${
                          isCurrentYear
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 hover:bg-blue-50 text-gray-700"
                        }`}
                      >
                         Current Year ({currentAcademicYear})
                      </Link>
                      
                      <Link
                        href={`/list/finance?${getQueryString({
                          search: queryParams.search,
                          sort: queryParams.sort,
                          status: queryParams.status,
                          feeTypeId: queryParams.feeTypeId,
                          showAll: "true",
                        })}`}
                        className={`px-3 py-2 text-xs rounded font-medium ${
                          showAllRecords
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                         All Years
                      </Link>

                      {/* Academic Year Selector */}
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                           Select Academic Year:
                        </label>
                        <form
                          method="GET"
                          action="/list/finance"
                          className="flex gap-1"
                        >
                          {/* Preserve existing query params */}
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
                          {queryParams.status && (
                            <input
                              type="hidden"
                              name="status"
                              value={queryParams.status}
                            />
                          )}
                          {queryParams.feeTypeId && (
                            <input
                              type="hidden"
                              name="feeTypeId"
                              value={queryParams.feeTypeId}
                            />
                          )}
                          <select
                            name="academicYear"
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            defaultValue={queryParams.academicYear || ""}
                          >
                            <option value="">Select Year</option>
                            {Array.from({ length: 5 }, (_, i) => {
                              const year = currentYear - i;
                              const academicYear = `${year}-${year + 1}`;
                              return (
                                <option key={academicYear} value={academicYear}>
                                  {academicYear}
                                </option>
                              );
                            })}
                          </select>
                          <button
                            type="submit"
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            Go
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3 border-t pt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                       Fee Type Filter
                    </label>
                    <form
                      method="GET"
                      action="/list/finance"
                      className="flex gap-2 flex-col sm:flex-row"
                    >
                      {/* Preserve other query params */}
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
                      {queryParams.status && (
                        <input
                          type="hidden"
                          name="status"
                          value={queryParams.status}
                        />
                      )}
                      {queryParams.academicYear && (
                        <input
                          type="hidden"
                          name="academicYear"
                          value={queryParams.academicYear}
                        />
                      )}
                      {queryParams.showAll && (
                        <input
                          type="hidden"
                          name="showAll"
                          value={queryParams.showAll}
                        />
                      )}

                      <select
                        name="feeTypeId"
                        defaultValue={queryParams.feeTypeId || ""}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 scrollbar-hide"
                      >
                        <option value="">All Fee Types</option>
                        {feeTypes.map((feeType) => (
                          <option key={feeType.id} value={feeType.id}>
                            {feeType.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="submit"
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Apply
                      </button>
                    </form>
                  </div>

                  <div className="mb-2 border-t pt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Payment Status
                    </label>
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/list/finance?${getQueryString({
                          ...queryParams,
                          status: "pending",
                        })}`}
                        className={`px-3 py-2 text-xs rounded font-medium ${
                          queryParams.status === "pending"
                            ? "bg-yellow-500 text-white"
                            : "bg-yellow-50 hover:bg-yellow-100 text-yellow-700"
                        }`}
                      >
                         Pending Only
                      </Link>
                      <Link
                        href={`/list/finance?${getQueryString({
                          ...queryParams,
                          status: "paid",
                        })}`}
                        className={`px-3 py-2 text-xs rounded font-medium ${
                          queryParams.status === "paid"
                            ? "bg-green-500 text-white"
                            : "bg-green-50 hover:bg-green-100 text-green-700"
                        }`}
                      >
                         Paid Only
                      </Link>
                      <Link
                        href={`/list/finance?${getQueryString({
                          ...queryParams,
                          status: "overdue",
                        })}`}
                        className={`px-3 py-2 text-xs rounded font-medium ${
                          queryParams.status === "overdue"
                            ? "bg-red-500 text-white"
                            : "bg-red-50 hover:bg-red-100 text-red-700"
                        }`}
                      >
                         Overdue Only
                      </Link>
                    </div>
                  </div>

                  {(queryParams.status ||
                    queryParams.academicYear ||
                    queryParams.feeTypeId ||
                    showAllRecords) && (
                    <div className="border-t pt-2">
                      <Link
                        href="/list/finance"
                        className="block text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-2 rounded hover:bg-blue-50"
                      >
                         Clear All Filters
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {role === "admin" && (
              <FormContainer 
                table="fee" 
                type="create" 
                // relatedData={{ students, feeTypes }}
              />
            )}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800">Total Fees</h3>
          <p className="text-2xl font-bold text-blue-900">
            {feeStats.total}
          </p>
          <p className="text-xs text-blue-600">
            ₹{feeStats.totalAmount.toLocaleString()}
          </p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <h3 className="text-sm font-medium text-green-800">Paid</h3>
          <p className="text-2xl font-bold text-green-900">
            {feeStats.paid}
          </p>
          <p className="text-xs text-green-600">
            ₹{feeStats.paidAmount.toLocaleString()}
          </p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800">Pending</h3>
          <p className="text-2xl font-bold text-yellow-900">
            {feeStats.pending}
          </p>
          <p className="text-xs text-yellow-600">
            ₹{feeStats.pendingAmount.toLocaleString()}
          </p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <h3 className="text-sm font-medium text-red-800">
            Collection Rate
          </h3>
          <p className="text-2xl font-bold text-red-900">
            {feeStats.collectionRate}%
          </p>
          <p className="text-xs text-red-600">
            {feeStats.overdue} Overdue
          </p>
        </div>
      </div>

      {/* TABLE */}
      <Table columns={columns} renderRow={renderRow} data={data} />

      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default FinanceListPage;