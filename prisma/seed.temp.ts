import { Day, PrismaClient, UserSex } from "@prisma/client";
const prisma = new PrismaClient();

import { createClerkClient } from "@clerk/backend";
import { config } from "dotenv";
config();

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function createAdminUser() {
  try {
    const existingUsers = await clerk.users.getUserList({
      username: ["anfaskaloor"],
    });

    if (existingUsers.data.length > 0) {
      await clerk.users.deleteUser(existingUsers.data[0].id);
      console.log("Existing user deleted");
    }

    const user = await clerk.users.createUser({
      username: "anfaskaloor",
      password: "SecureAdmin123!",
      publicMetadata: { role: "admin" },
    });
    
    console.log("Admin user created:", user.id);
  } catch (error) {
    console.error("Error creating admin:", error);
  }
}

async function main() {
  await createAdminUser();

  // ADMIN
  await prisma.admin.create({
    data: {
      id: "admin1",
      username: "anfaskaloor",
    },
  });

  // GRADE
  for (let i = 1; i <= 6; i++) {
    await prisma.grade.create({
      data: {
        level: i,
      },
    });
  }

  // CLASS
  // for (let i = 1; i <= 6; i++) {
  //   await prisma.class.create({
  //     data: {
  //       name: `${i}A`,
  //       gradeId: i,
  //       capacity: Math.floor(Math.random() * (20 - 15 + 1)) + 15,
  //     },
  //   });
  // }

  // SUBJECT
  const subjectData = [
    { name: "Mathematics" },
    { name: "Science" },
    { name: "English" },
    { name: "History" },
    { name: "Geography" },
    { name: "Physics" },
    { name: "Chemistry" },
    { name: "Biology" },
    { name: "Computer Science" },
    { name: "Arts" },
  ];

  for (const subject of subjectData) {
    await prisma.subject.create({ data: subject });
  }

  // TEACHER
  for (let i = 1; i <= 15; i++) {
    await prisma.teacher.create({
      data: {
        id: `teacher${i}`, // Unique ID for the teacher
        username: `teacher${i}`,
        name: `TName${i}`,
        surname: `TSurname${i}`,
        email: `teacher${i}@example.com`,
        phone: `123-456-789${i}`,
        address: `Address${i}`,
        bloodType: "A+",
        sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
        subjects: { connect: [{ id: (i % 10) + 1 }] },
        classes: { connect: [{ id: (i % 6) + 1 }] },
        birthday: new Date(
          new Date().setFullYear(new Date().getFullYear() - 30)
        ),
      },
    });
  }

  // LESSON
  for (let i = 1; i <= 30; i++) {
    await prisma.lesson.create({
      data: {
        name: `Lesson${i}`,
        day: Day[
          Object.keys(Day)[
            Math.floor(Math.random() * Object.keys(Day).length)
          ] as keyof typeof Day
        ],
        subjectId: (i % 10) + 1,
        classId: (i % 6) + 1,
        teacherId: `teacher${(i % 15) + 1}`,
      },
    });
  }

  // PARENT
  for (let i = 1; i <= 25; i++) {
    await prisma.parent.create({
      data: {
        id: `parentId${i}`,
        username: `parentId${i}`,
        name: `PName ${i}`,
        surname: `PSurname ${i}`,
        email: `parent${i}@example.com`,
        phone: `123-456-789${i}`,
        address: `Address${i}`,
      },
    });
  }

  // STUDENT
  for (let i = 1; i <= 50; i++) {
    await prisma.student.create({
      data: {
        id: `student${i}`,
        username: `student${i}`,
        name: `SName${i}`,
        rollNo: i,
        surname: `SSurname ${i}`,
        email: `student${i}@example.com`,
        phone: `987-654-321${i}`,
        address: `Address${i}`,
        bloodType: "O-",
        sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
        parentId: `parentId${Math.ceil(i / 2) % 25 || 25}`,
        gradeId: (i % 6) + 1,
        classId: (i % 6) + 1,
        birthday: new Date(
          new Date().setFullYear(new Date().getFullYear() - 10)
        ),
      },
    });
  }

  // EXAM
  for (let i = 1; i <= 10; i++) {
    await prisma.exam.create({
      data: {
        title: `Exam ${i}`,
        startTime: new Date(new Date().setHours(new Date().getHours() + 1)),
        endTime: new Date(new Date().setHours(new Date().getHours() + 2)),
        lessonId: (i % 30) + 1,
      },
    });
  }

  // ASSIGNMENT
  for (let i = 1; i <= 10; i++) {
    await prisma.assignment.create({
      data: {
        title: `Assignment ${i}`,
        startDate: new Date(new Date().setHours(new Date().getHours() + 1)),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        lessonId: (i % 30) + 1,
      },
    });
  }

  // RESULT
  for (let i = 1; i <= 10; i++) {
    await prisma.result.create({
      data: {
        score: 90,
        studentId: `student${i}`,
        ...(i <= 5 ? { examId: i } : { assignmentId: i - 5 }),
      },
    });
  }

  // ATTENDANCE
  for (let i = 1; i <= 10; i++) {
    await prisma.attendance.create({
      data: {
        date: new Date(),
        present: true,
        studentId: `student${i}`,
      },
    });
  }

  // EVENT
  for (let i = 1; i <= 5; i++) {
    await prisma.event.create({
      data: {
        title: `Event ${i}`,
        description: `Description for Event ${i}`,
        startTime: new Date(new Date().setHours(new Date().getHours() + 1)),
        endTime: new Date(new Date().setHours(new Date().getHours() + 2)),
        classId: (i % 5) + 1,
      },
    });
  }

  // ANNOUNCEMENT
  for (let i = 1; i <= 5; i++) {
    await prisma.announcement.create({
      data: {
        title: `Announcement ${i}`,
        description: `Description for Announcement ${i}`,
        date: new Date(),
        classId: (i % 5) + 1,
      },
    });
  }

  // FEE TYPES
  const feeTypes = [
    {
      name: "Tuition",
      description: "Monthly tuition fee",
      defaultAmount: 150.0,
    },
    {
      name: "Lab Fee",
      description: "Science lab maintenance fee",
      defaultAmount: 50.0,
    },
    {
      name: "Library Fee",
      description: "Library membership and maintenance",
      defaultAmount: 30.0,
    },
    {
      name: "Transport",
      description: "School bus fee",
      defaultAmount: 75.0,
    },
  ];

  for (const feeType of feeTypes) {
    await prisma.feeType.create({ data: feeType });
  }

  // FEES
  const semesters = ["Spring", "Fall"];
  const academicYear = "2024-2025";

  for (let i = 1; i <= 25; i++) {
    for (let j = 1; j <= 2; j++) {
      await prisma.fee.create({
        data: {
          studentId: `student${i}`,
          feeTypeId: j,
          amount: feeTypes[j - 1].defaultAmount || 0,
          paidAmount: j % 2 === 0 ? feeTypes[j - 1].defaultAmount || 0 : 0,
          dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          paidDate: j % 2 === 0 ? new Date() : null,
          academicYear,
          semester: semesters[i % 2],
          status: j % 2 === 0 ? "paid" : "pending",
          paymentMethod: j % 2 === 0 ? "Credit Card" : null,
          transactionId: j % 2 === 0 ? `TXN-${i}${j}` : null,
          description: `Fee for ${feeTypes[j - 1].name} - ${semesters[i % 2]}`,
        },
      });
    }
  }

  console.log("Seeding completed successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
