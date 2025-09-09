import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Events from "@/components/Events";

const ParentPage = async () => {
  const { userId } = await auth();
  const currentUserId = userId;

  if (!currentUserId) {
    return <div className="p-4 text-red-500">User not authenticated.</div>;
  }

  // Fetch all children of this parent
  const students = await prisma.student.findMany({
    where: {
      parentId: currentUserId,
    },
    include: {
      class: true,
    },
  });

  if (students.length === 0) {
    return <div className="p-4 text-red-500">No students linked to this parent account.</div>;
  }

  // Fetch behavior records for all students
  const allBehaviorRecords = await prisma.incident.findMany({
    where: {
      studentId: {
        in: students.map((s) => s.id),
      },
    },
    include: {
      behavior: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3 flex flex-col gap-6">
        {students.map((student) => {
          const studentBehavior = allBehaviorRecords.filter(
            (record) => record.studentId === student.id
          );

          return (
            <div key={student.id} className="bg-white p-4 rounded-md shadow-md">
              {/* SCHEDULE */}
              <h1 className="text-xl font-semibold mb-4">
                Schedule ({student.name} {student.surname})
              </h1>
              <BigCalendarContainer type="classId" id={student.classId} />

              {/* BEHAVIOR RECORDS */}
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-2"> ({student.name} {student.surname}) Behavior Records</h2>
                {studentBehavior.length > 0 ? (
                  <ul className="space-y-4">
                    {studentBehavior.map((record) => (
                      <li key={record.id} className="border-b pb-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{record.behavior.title}</span>
                          <span
                            className={`text-sm px-2 py-1 rounded-full ${
                              record.behavior.isNegative
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {record.behavior.isNegative ? "-" : "+"}
                            {record.behavior.point} pts
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.behavior.description}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Intl.DateTimeFormat("en-GB", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(record.date)}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No behavior records found.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <EventCalendarContainer />
        <Announcements />
        <Events />
      </div>
    </div>
  );
};

export default ParentPage;
