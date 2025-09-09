import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import FormContainer from "@/components/FormContainer";
import Performance from "@/components/Performance";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Teacher } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const SingleTeacherPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;

  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const teacher:
    | (Teacher & {
        _count: { subjects: number; lessons: number; classes: number };
      })
    | null = await prisma.teacher.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          subjects: true,
          lessons: true,
          classes: true,
        },
      },
    },
  });

  if (!teacher) {
    return notFound();
  }

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 xl:flex-row">
      {/* LEFT COLUMN */}
      <div className="w-full xl:w-2/3 flex flex-col gap-6">
        {/* TEACHER PROFILE SECTION */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* TEACHER AVATAR */}
            <div className="w-full md:w-1/3 p-6 flex justify-center bg-gray-50 items-center">
              <div className="relative w-40 h-40 rounded-full border-2 border-white shadow-md">
                <Image
                  src={teacher.img || "/noAvatar.png"}
                  alt={`${teacher.name} ${teacher.surname}`}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
            </div>
            
            {/* TEACHER DETAILS */}
            <div className="w-full md:w-2/3 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {teacher.name} {teacher.surname}
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">Teacher ID: {teacher.id}</p>
                </div>
                {role === "admin" && (
                  <FormContainer table="teacher" type="update" data={teacher} />
                )}
              </div>
              
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-50">
                    <Image src="/singleBranch.png" alt="" width={20} height={20} className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Subjects</p>
                    <p className="font-medium">{teacher._count.subjects}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-50">
                    <Image src="/singleLesson.png" alt="" width={20} height={20} className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Lessons</p>
                    <p className="font-medium">{teacher._count.lessons}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-50">
                    <Image src="/singleClass.png" alt="" width={20} height={20} className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Classes</p>
                    <p className="font-medium">{teacher._count.classes}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-yellow-50">
                    <Image src="/singleAttendance.png" alt="" width={20} height={20} className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Attendance</p>
                    <p className="font-medium">90%</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Contact Information</p>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Image src="/mail.png" alt="" width={16} height={16} className="w-4 h-4 opacity-70" />
                      <span>{teacher.email || "Not provided"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Image src="/phone.png" alt="" width={16} height={16} className="w-4 h-4 opacity-70" />
                      <span>{teacher.phone || "Not provided"}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Personal Details</p>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Image src="/date.png" alt="" width={16} height={16} className="w-4 h-4 opacity-70" />
                      <span>{new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(teacher.birthday)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Image src="/blood.png" alt="" width={16} height={16} className="w-4 h-4 opacity-70" />
                      <span>{teacher.bloodType || "Not provided"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TEACHER SCHEDULE */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              Teaching Schedule
            </h2>
          </div>
          <div className="h-[600px]">
            <BigCalendarContainer type="teacherId" id={teacher.id} />
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="w-full xl:w-1/3 flex flex-col gap-6">
        {/* QUICK ACTIONS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
            <Link
              href={`/list/classes?supervisorId=${teacher.id}`}
              className="p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-3 text-blue-700"
            >
              <span className="text-sm font-medium">Teacher&apos;s Classes</span>
            </Link>
            <Link
              href={`/list/students?teacherId=${teacher.id}`}
              className="p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors flex items-center gap-3 text-purple-700"
            >
              <span className="text-sm font-medium">Teacher&apos;s Students</span>
            </Link>
            <Link
              href={`/list/lessons?teacherId=${teacher.id}`}
              className="p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors flex items-center gap-3 text-green-700"
            >
              <span className="text-sm font-medium">Teacher&apos;s Lessons</span>
            </Link>
            <Link
              href={`/list/exams?teacherId=${teacher.id}`}
              className="p-3 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors flex items-center gap-3 text-yellow-700"
            >
              <span className="text-sm font-medium">Teacher&apos;s Exams</span>
            </Link>
          </div>
        </div>

        {/* PERFORMANCE */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Performance />
        </div>

        {/* ANNOUNCEMENTS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Announcements />
        </div>
      </div>
    </div>
  );
};

export default SingleTeacherPage;