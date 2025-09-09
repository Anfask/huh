export const dynamic = "force-dynamic";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Prisma, Teacher } from "@prisma/client";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

type ClassList = Class & { supervisor?: Teacher; grade: { level: number } };

const ClassListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

  const columns = [
    {
      header: "Class Name",
      accessor: "name",
    },
    {
      header: "Capacity",
      accessor: "capacity",
      className: "hidden md:table-cell",
    },
    {
      header: "Grade",
      accessor: "grade",
      className: "hidden md:table-cell",
    },
    {
      header: "Class Teacher",
      accessor: "Class Teacher",
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

  const renderRow = (item: ClassList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      {/* {rew} */}
      <td className="flex items-center gap-4 p-4">{item.name}</td>
      <td className="hidden md:table-cell">{item.capacity}</td>
      <td className="hidden md:table-cell">Grade {item.grade?.level}</td>
      <td className="hidden md:table-cell">
        {item.supervisor &&
          item.supervisor.name + " " + item.supervisor.surname}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="class" type="update" data={item} />
              <FormContainer table="class" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const resolvedSearchParams = await searchParams;

  const { page, ...queryParams } = resolvedSearchParams;

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION

  const query: Prisma.ClassWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.name = { contains: value, mode: "insensitive" };
            break;
          case "capacityRange":
            const [min, max] = value.split("-").map(Number);
            query.capacity = { gte: min, lte: max };
            break;
          default:
            break;
        }
      }
    }
  }

  // Handle sorting
  const currentSort = queryParams.sort || "name_asc";
  const orderBy: Prisma.ClassOrderByWithRelationInput = (() => {
    switch (currentSort) {
      case "name_asc":
        return { name: "asc" };
      case "name_desc":
        return { name: "desc" };
      case "grade_asc":
        return { grade: { level: "asc" } };
      case "grade_desc":
        return { grade: { level: "desc" } };
      default:
        return { name: "asc" };
    }
  })();

  const [data, count] = await prisma.$transaction([
    prisma.class.findMany({
      where: query,
      orderBy,
      include: {
        supervisor: true,
        grade: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.class.count({ where: query }),
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
    { value: "grade_asc", label: "Grade Low-High" },
    { value: "grade_desc", label: "Grade High-Low" },
  ];
  const capacityRanges = [
    { label: "All Capacities", value: "" },
    { label: "0 - 20", value: "0-20" },
    { label: "21 - 40", value: "21-40" },
    { label: "41 - 60", value: "41-60" },
    { label: "61 - 80", value: "61-80" },
    { label: "81+", value: "81-1000" },
  ];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Classes</h1>
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
                      href={`/list/classes?${getQueryString({
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

            {/* Capacity Filter Dropdown */}
            <div className="relative group">
              <button
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  queryParams.capacityRange
                    ? "bg-blue-500 text-white"
                    : "bg-lamaYellow hover:bg-yellow-400"
                }`}
              >
                <Image src="/filter.png" alt="Filter" width={14} height={14} />
              </button>
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-1">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Filter by Capacity
                  </div>
                  {capacityRanges.map((range) => (
                    <Link
                      key={range.value}
                      href={`/list/classes?${getQueryString({
                        ...queryParams,
                        capacityRange: range.value || undefined,
                      })}`}
                      className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                        queryParams.capacityRange === range.value
                          ? "bg-blue-50 text-blue-600"
                          : ""
                      }`}
                    >
                      {range.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {role === "admin" && <FormContainer table="class" type="create" />}
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

export default ClassListPage;