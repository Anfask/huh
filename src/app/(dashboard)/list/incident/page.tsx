export const dynamic = "force-dynamic";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Behavior, Incident, Prisma, Student, Teacher } from "@prisma/client";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

// Define a more specific type for IncidentList to match the selected fields
type IncidentList = Incident & {
  behavior: Pick<Behavior, "title" | "point" | "isNegative">;
  student: Pick<Student, "name" | "surname">;
};

type SummaryItem = {
  studentId: string;
  studentName: string;
  className: string;
  gender: string;
  phone: string | null;
  totalPoints: number;
  totalIncidents: number;
};

const IncidentListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { sessionClaims, userId } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

  const columns = [
    {
      header: "Student",
      accessor: "student",
      className: "text-center",
    },
    {
      header: "Behavior",
      accessor: "behavior",
      className: "text-center hidden md:table-cell",
    },
    {
      header: "Points",
      accessor: "points",
      className: "text-center hidden lg:table-cell",
    },
    {
      header: "Date",
      accessor: "date",
      className: "text-center hidden lg:table-cell",
    },
    {
      header: "Comment",
      accessor: "comment",
      className: "text-center hidden xl:table-cell",
    },
    ...(role === "admin" || role === "teacher"
      ? [
          {
            header: "Actions",
            accessor: "action",
            className: "text-center",
          },
        ]
      : []),
  ];

  const summaryColumns = [
    {
      header: "Student Name",
      accessor: "studentName",
      className: "text-center",
    },
    {
      header: "Class",
      accessor: "className",
      className: "text-center",
    },
    {
      header: "Gender",
      accessor: "gender",
      className: "text-center",
    },
    {
      header: "Phone",
      accessor: "phone",
      className: "text-center",
    },
    {
      header: "Total Points",
      accessor: "totalPoints",
      className: "text-center",
    },
    {
      header: "Total Incidents",
      accessor: "totalIncidents",
      className: "text-center",
    },
  ];

  const renderRow = (item: IncidentList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center justify-center gap-4 p-4">
        {item.student.name} {item.student.surname}
      </td>
      <td className="hidden md:table-cell text-center">{item.behavior.title}</td>
      <td className="hidden lg:table-cell text-center">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.behavior.isNegative
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {item.behavior.isNegative
            ? `-${item.behavior.point}`
            : `+${item.behavior.point}`}
        </span>
      </td>
      <td className="hidden lg:table-cell text-center">
        {new Date(item.date).toLocaleDateString()}
      </td>
      <td className="hidden xl:table-cell text-center">
        <div className="max-w-[150px] mx-auto truncate" title={item.comment}>
          {item.comment}
        </div>
      </td>
      <td>
        <div className="flex items-center justify-center gap-2">
          {(role === "admin" || role === "teacher") && (
            <>
              <FormContainer table="incident" type="update" data={item} />
              <FormContainer table="incident" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const renderSummaryRow = (item: SummaryItem) => (
    <tr
      key={item.studentId}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="p-4 text-center">{item.studentName}</td>
      <td className="p-4 text-center">{item.className}</td>
      <td className="p-4 text-center">{item.gender}</td>
      <td className="p-4 text-center">{item.phone || "N/A"}</td>
      <td className="p-4 text-center">{item.totalPoints}</td>
      <td className="p-4 text-center">{item.totalIncidents}</td>
    </tr>
  );

  const resolvedSearchParams = await searchParams;
  const { page, view, ...queryParams } = resolvedSearchParams;
  const isSummary = view === "summary";
  const p = page ? parseInt(page) : 1;

  // ✅ BUILD BASE QUERY WITH ROLE-BASED FILTERING
  const buildBaseQuery = () => {
    if (role === "teacher") {
      return {
        student: {
          class: {
            supervisorId: userId!, // Only show incidents for teacher's supervised students
          },
        },
      };
    } else if (role === "student") {
      return {
        studentId: userId!, // Only show student's own incidents
      };
    } else if (role === "parent") {
      return {
        student: {
          parentId: userId!, // Only show incidents for parent's children
        },
      };
    }
    return {}; // Admin sees all incidents
  };

  // URL PARAMS CONDITION for Incidents
  const incidentQuery: Prisma.IncidentWhereInput = {
    ...buildBaseQuery(), // ✅ Apply role-based filtering
  };

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "studentId":
            incidentQuery.studentId = value;
            break;
          case "behaviorId":
            incidentQuery.behaviorId = parseInt(value);
            break;
          case "givenById":
            incidentQuery.givenById = value;
            break;
          case "type":
            if (value === "positive") {
              incidentQuery.behavior = { isNegative: false };
            } else if (value === "negative") {
              incidentQuery.behavior = { isNegative: true };
            }
            break;
          case "search":
            incidentQuery.OR = [
              { behavior: { title: { contains: value, mode: "insensitive" } } },
              { comment: { contains: value, mode: "insensitive" } },
              {
                student: {
                  OR: [
                    { name: { contains: value, mode: "insensitive" } },
                    { surname: { contains: value, mode: "insensitive" } },
                  ],
                },
              },
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  // Handle sorting for detailed view
  const currentSort = queryParams.sort || "date_desc";
  const orderBy: Prisma.IncidentOrderByWithRelationInput = (() => {
    switch (currentSort) {
      case "date_asc":
        return { date: "asc" };
      case "date_desc":
        return { date: "desc" };
      case "student_asc":
        return { student: { name: "asc" } };
      case "student_desc":
        return { student: { name: "desc" } };
      case "behavior_asc":
        return { behavior: { title: "asc" } };
      case "behavior_desc":
        return { behavior: { title: "desc" } };
      case "points_asc":
        return { behavior: { point: "asc" } };
      case "points_desc":
        return { behavior: { point: "desc" } };
      default:
        return { date: "desc" };
    }
  })();

  let data: IncidentList[] | SummaryItem[] = [];
  let count: number = 0;

  if (isSummary) {
    // ✅ BUILD STUDENT QUERY WITH ROLE-BASED FILTERING FOR SUMMARY
    const studentQuery: Prisma.StudentWhereInput = {};
    
    // Role-based filtering for summary
    if (role === "teacher") {
      studentQuery.class = {
        supervisorId: userId!, // Only show teacher's supervised students
      };
    } else if (role === "student") {
      studentQuery.id = userId!; // Only show the student themselves
    } else if (role === "parent") {
      studentQuery.parentId = userId!; // Only show parent's children
    }

    // Build additional filters array
    const additionalFilters: Prisma.StudentWhereInput[] = [];

    // If studentId is provided, add to filters
    if (queryParams.studentId) {
      additionalFilters.push({ id: queryParams.studentId });
    }

    // If search is provided, add to filters
    if (queryParams.search) {
      additionalFilters.push({
        OR: [
          { name: { contains: queryParams.search, mode: "insensitive" } },
          { surname: { contains: queryParams.search, mode: "insensitive" } },
        ],
      });
    }

    // Combine base query with additional filters
    if (additionalFilters.length > 0) {
      const baseFilters = [];
      
      if (role === "teacher") {
        baseFilters.push({ class: { supervisorId: userId! } });
      } else if (role === "student") {
        baseFilters.push({ id: userId! });
      } else if (role === "parent") {
        baseFilters.push({ parentId: userId! });
      }

      studentQuery.AND = [
        ...baseFilters,
        ...additionalFilters,
      ];
      
      // Remove the base filters since they're now in AND
      if (role === "teacher") {
        delete studentQuery.class;
      } else if (role === "student") {
        delete studentQuery.id;
      } else if (role === "parent") {
        delete studentQuery.parentId;
      }
    }

    const summaryData = await prisma.student.findMany({
      where: studentQuery,
      include: {
        class: { select: { name: true } },
        Incident: {
          // ✅ Filter incidents as well (though they should already be filtered by student selection)
          where: Object.keys(incidentQuery).length > 1 ? 
            Object.fromEntries(
              Object.entries(incidentQuery).filter(([key]) => key !== 'student')
            ) : {},
          include: {
            behavior: { select: { point: true, isNegative: true } },
          },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: (() => {
        switch (currentSort) {
          case "student_asc":
            return { name: "asc" };
          case "student_desc":
            return { name: "desc" };
          case "points_asc":
          case "points_desc":
            return { name: "asc" }; // Fallback to name sorting
          default:
            return { name: "asc" };
        }
      })(),
    });

    data = summaryData.map((student) => ({
      studentId: student.id,
      studentName: `${student.name} ${student.surname}`,
      className: student.class.name,
      gender: student.sex,
      phone: student.phone,
      totalPoints: student.Incident.reduce((sum, incident) => {
        const points = incident.behavior.isNegative
          ? -incident.behavior.point
          : incident.behavior.point;
        return sum + points;
      }, 0),
      totalIncidents: student.Incident.length,
    }));

    // Sort by totalPoints if requested
    if (currentSort === "points_asc") {
      data.sort((a, b) => a.totalPoints - b.totalPoints);
    } else if (currentSort === "points_desc") {
      data.sort((a, b) => b.totalPoints - a.totalPoints);
    }

    count = await prisma.student.count({
      where: studentQuery,
    });
  } else {
    // Fetch detailed incident data
    [data, count] = await prisma.$transaction([
      prisma.incident.findMany({
        where: incidentQuery,
        orderBy,
        include: {
          behavior: { select: { title: true, point: true, isNegative: true } },
          student: { select: { name: true, surname: true } },
        },
        take: ITEM_PER_PAGE,
        skip: ITEM_PER_PAGE * (p - 1),
      }),
      prisma.incident.count({ where: incidentQuery }),
    ]);
  }

  const getQueryString = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    return query.toString();
  };

  const sortOptions = [
    { value: "date_desc", label: "Newest First" },
    { value: "date_asc", label: "Oldest First" },
    { value: "student_asc", label: "Student A-Z" },
    { value: "student_desc", label: "Student Z-A" },
    { value: "behavior_asc", label: "Behavior A-Z" },
    { value: "behavior_desc", label: "Behavior Z-A" },
    { value: "points_asc", label: "Lowest Points" },
    { value: "points_desc", label: "Highest Points" },
  ];

  const filterOptions = [
    { value: "", label: "All Types" },
    { value: "positive", label: "Positive Only" },
    { value: "negative", label: "Negative Only" },
  ];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {/* ✅ Update header to reflect role-based view */}
          {role === "teacher" 
            ? "My Students' Incidents" 
            : role === "student" 
            ? "My Incidents" 
            : role === "parent" 
            ? "My Children's Incidents" 
            : "All Incidents"}
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {/* TOGGLE BUTTON */}
            <Link
              href={`/list/incident?${getQueryString({
                ...queryParams,
                page,
                view: isSummary ? undefined : "summary",
              })}`}
              className="text-sm px-4 py-2 rounded-md bg-lamaYellow hover:bg-yellow-400 transition-colors"
            >
              {isSummary ? "Show Details" : "Show Summary"}
            </Link>
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
                      href={`/list/incident?${getQueryString({
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
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow hover:bg-yellow-400 transition-colors">
                <Image src="/filter.png" alt="Filter" width={14} height={14} />
              </button>
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[150px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-1">
                  {filterOptions.map((option) => (
                    <Link
                      key={option.value}
                      href={`/list/incident?${getQueryString({
                        ...queryParams,
                        type: option.value || undefined,
                      })}`}
                      className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                        (queryParams.type || "") === option.value
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

            {(role === "admin" || role === "teacher") && (
              <FormContainer table="incident" type="create" />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      {!isSummary ? (
        <Table columns={columns} renderRow={renderRow} data={data as IncidentList[]} />
      ) : (
        <Table columns={summaryColumns} renderRow={renderSummaryRow} data={data as SummaryItem[]} />
      )}

      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default IncidentListPage;