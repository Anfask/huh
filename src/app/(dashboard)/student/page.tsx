import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Events from "@/components/Events";

const StudentPage = async () => {
  const { userId } = await auth();

  if (!userId) {
    return <div className="p-4 text-red-500">User not authenticated.</div>;
  }

  // Fetch student record
  const student = await prisma.student.findUnique({
    where: { id: userId },
  });

  if (!student) {
    return <div className="p-4 text-red-500">Student not found.</div>;
  }

  // Fetch class
  const classItem = await prisma.class.findMany({
    where: {
      students: { some: { id: userId } },
    },
  });

  if (classItem.length === 0) {
    return <div className="p-4 text-red-500">No class assigned to this student.</div>;
  }

  // Fetch behavior records
  const behaviorRecords = await prisma.incident.findMany({
    where: { studentId: student.id },
    include: {
      behavior: true,
    },
    orderBy: { date: "desc" },
    take: 10,
  });

  const totalBehaviorPoints = behaviorRecords.reduce((total, record) => {
    return total + (record.behavior.isNegative ? -record.behavior.point : record.behavior.point);
  }, 0);

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row">
      <div className="w-full flex flex-col gap-6">
        {/* Behavior Points Summary */}
        <div className="w-full bg-white p-4 rounded-md shadow">
          <h2 className="text-lg font-semibold">Your Behavior Points</h2>
          <p
            className={`text-2xl font-bold mt-2 ${
              totalBehaviorPoints < 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {totalBehaviorPoints} pts
          </p>
        </div>

        {/* Schedule */}
        <div className="h-full bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">
            Schedule ({classItem[0].name || "Class"})
          </h1>
          <BigCalendarContainer type="classId" id={classItem[0].id} />
        </div>

        {/* Behavior Records Section */}
        <div className="bg-white p-4 rounded-md">
          <h2 className="text-lg font-semibold mb-4">Your Behavior Records</h2>
          {behaviorRecords.length > 0 ? (
            <ul className="space-y-4">
              {behaviorRecords.map((record) => (
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
                  <div className="text-sm text-gray-500">{record.behavior.description}</div>
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

      {/* RIGHT SIDE */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <EventCalendarContainer />
        <Announcements />
        <Events />
      </div>
    </div>
  );
};

export default StudentPage;
