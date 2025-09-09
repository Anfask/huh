import prisma from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";

const UserCard = async ({
  type,
}: {
  type: "admin" | "teacher" | "student" | "parent";
}) => {
  const modelMap: Record<typeof type, any> = {
    admin: prisma.admin,
    teacher: prisma.teacher,
    student: prisma.student,
    parent: prisma.parent,
  };

  const data = await modelMap[type].count();

  const currentYear = new Date().getFullYear();
  const academicStartYear = new Date().getMonth() >= 6 ? currentYear : currentYear - 1;
  const academicEndYear = academicStartYear + 1;
  const academicYear = `${academicStartYear}/${academicEndYear}`;

  // ✅ Updated path to match your route format
  const pagePath = `/list/${type}s`;

  return (
    <div className="rounded-2xl odd:bg-lamaPurple even:bg-lamaYellow p-4 flex-1 min-w-[130px]">
      <div className="flex justify-between items-center">
        <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">
          {academicYear}
        </span>
        <Link href={pagePath}>
          <Image
            src="/more.png"
            alt="More"
            width={20}
            height={20}
            className="cursor-pointer"
          />
        </Link>
      </div>
      <h1 className="text-2xl font-semibold my-4">{data}</h1>
      <h2 className="capitalize text-sm font-medium text-gray-500">{type}s</h2>
    </div>
  );
};

export default UserCard;
