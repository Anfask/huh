export const dynamic = "force-dynamic";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Behavior, Prisma } from "@prisma/client";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

type BehaviorList = Behavior;

const BehaviorListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

  const columns = [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "Points",
      accessor: "point",
      className: "hidden md:table-cell",
    },
    {
      header: "Description",
      accessor: "description",
      className: "hidden lg:table-cell",
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

  const renderRow = (item: BehaviorList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td className="hidden md:table-cell">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.isNegative
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {item.isNegative ? `-${item.point}` : `${item.point}`}
        </span>
      </td>
      <td className="hidden lg:table-cell">
        <div className="max-w-[200px] truncate" title={item.description}>
          {item.description}
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="behavior" type="update" data={item} />
              <FormContainer table="behavior" type="delete" id={item.id} />
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
  const query: Prisma.BehaviorWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.OR = [
              { title: { contains: value, mode: "insensitive" } },
              { description: { contains: value, mode: "insensitive" } },
            ];
            break;
          case "type":
            if (value === "positive") {
              query.isNegative = false;
            } else if (value === "negative") {
              query.isNegative = true;
            }
            break;
          default:
            break;
        }
      }
    }
  }

  // Handle sorting
  const currentSort = queryParams.sort || "title_asc";
  const orderBy: Prisma.BehaviorOrderByWithRelationInput = (() => {
    switch (currentSort) {
      case "title_asc":
        return { title: "asc" };
      case "title_desc":
        return { title: "desc" };
      case "point_asc":
        return { point: "asc" };
      case "point_desc":
        return { point: "desc" };
      case "type_positive":
        return { isNegative: "asc" }; // false first (positive)
      case "type_negative":
        return { isNegative: "desc" }; // true first (negative)
      default:
        return { title: "asc" };
    }
  })();

  const [data, count] = await prisma.$transaction([
    prisma.behavior.findMany({
      where: query,
      orderBy,
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.behavior.count({ where: query }),
  ]);

  const getQueryString = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    return query.toString();
  };

  const sortOptions = [
    { value: "title_asc", label: "Title A-Z" },
    { value: "title_desc", label: "Title Z-A" },
    { value: "point_desc", label: "Highest Points" },
    { value: "point_asc", label: "Lowest Points" },
    { value: "type_positive", label: "Positive First" },
    { value: "type_negative", label: "Negative First" },
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
        <h1 className="hidden md:block text-lg font-semibold">All Behaviors</h1>
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
                      href={`/list/behaviors?${getQueryString({
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
                      href={`/list/behaviors?${getQueryString({
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

            {role === "admin" && (
              <FormContainer table="behavior" type="create" />
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

export default BehaviorListPage;
