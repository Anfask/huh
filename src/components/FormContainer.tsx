import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { currentUser } from "@clerk/nextjs/server";

export type FormContainerProps = {
  table:
  | "teacher"
  | "student"
  | "parent"
  | "subject"
  | "class"
  | "lesson"
  | "exam"
  | "assignment"
  | "result"
  | "attendance"
  | "teacherAttendance"
  | "event"
  | "announcement"
  | "fee"
  | "incident"
  | "behavior";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {
  let relatedData = {};

  let user;
  try {
    user = await currentUser();
  } catch (error: any) {
    console.log("err-----------:-", error.errors[0]);
    // return (
    //   <div>
    //     <p>Unable to verify authentication. Please try again.</p>
    //     <button onClick={() => window.location.reload()}>Retry</button>
    //   </div>
    // );
  }
  const role = user?.publicMetadata.role as string;
  const currentUserId = user?.id;

  if (type !== "delete") {
    switch (table) {
      case "subject": {
        const subjectTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: subjectTeachers };
        break;
      }

      case "class": {
        const classGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const classTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: classTeachers, grades: classGrades };
        break;
      }

      case "teacher": {
        const teacherSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        relatedData = { subjects: teacherSubjects };
        break;
      }

      case "student": {
        const studentGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const studentClasses = await prisma.class.findMany({
          include: {
            _count: { select: { students: true } },
            students: { select: { rollNo: true } }
          },
        });
        const parents = await prisma.parent.findMany({
          select: { id: true, name: true, surname: true },
        });
        // 👇 Build usedRollNos map
        const usedRollNosPerClass = studentClasses.reduce((acc, classItem) => {
          acc[classItem.id] = classItem.students.map((s) => s.rollNo);
          return acc;
        }, {} as Record<number, number[]>);

        relatedData = {
          classes: studentClasses.map(({ students, ...rest }) => rest),
          grades: studentGrades,
          parents: parents,
          usedRollNos: usedRollNosPerClass,
        };
        break;
      }

      case "exam": {
        const examLessons = await prisma.lesson.findMany({
          where: role === "teacher" ? { teacherId: currentUserId! } : {},
          select: { id: true, name: true },
        });
        relatedData = { lessons: examLessons };
        break;
      }

      case "lesson": {
        const subjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });

        const classes = await prisma.class.findMany({
          select: { id: true, name: true },
        });

        const teachers = await prisma.teacher.findMany({
          select: { id: true, name: true },
        });

        relatedData = {
          subjects,
          classes,
          teachers:
            role === "teacher"
              ? teachers.filter((t) => t.id === currentUserId)
              : teachers,
        };
        break;
      }

      case "assignment": {
        const assignmentLessons = await prisma.lesson.findMany({
          where: role === "teacher" ? { teacherId: currentUserId! } : {},
          select: {
            id: true,
            name: true,
            subject: {
              select: { name: true },
            },
            class: {
              select: { name: true },
            },
          },
        });
        relatedData = { lessons: assignmentLessons };
        break;
      }

      case "result": {
        // Get teacher's assigned class IDs first if user is a teacher
        let teacherClassIds: number[] = [];
        
        if (role === "teacher" && currentUserId) {
          const teacherLessons = await prisma.lesson.findMany({
            where: { teacherId: currentUserId },
            select: { classId: true },
            distinct: ['classId']
          });
          
          teacherClassIds = teacherLessons.map(lesson => lesson.classId);
          
          // Debug logging
          console.log("🔍 FormContainer Debug:");
          console.log("Teacher ID:", currentUserId);
          console.log("Teacher Class IDs:", teacherClassIds);
        }

        // Fetch students - filter by teacher's classes if role is teacher
        const students = await prisma.student.findMany({
          where: role === "teacher" && teacherClassIds.length > 0
            ? {
                classId: {
                  in: teacherClassIds
                }
              }
            : role === "teacher"
            ? {
                class: {
                  lessons: {
                    some: {
                      teacherId: currentUserId!,
                    },
                  },
                },
              }
            : {},
          select: {
            id: true,
            name: true,
            surname: true,
            classId: true,
            class: {
              select: { name: true },
            },
          },
        });

        // Format students with full name and class info
        const formattedStudents = students.map((student) => ({
          id: student.id,
          name: `${student.name} ${student.surname}${student.class ? ` (${student.class.name})` : ""}`,
          classId: student.classId,
          className: student.class?.name
        }));

        // Fetch exams - filter by teacher if role is teacher
        const exams = await prisma.exam.findMany({
          where: role === "teacher"
            ? {
                lesson: {
                  teacherId: currentUserId!,
                },
              }
            : {},
          select: {
            id: true,
            title: true,
            lesson: {
              select: {
                name: true,
                classId: true,
                subject: {
                  select: { name: true },
                },
                class: {
                  select: { name: true },
                },
              },
            },
          },
        });

        // Format exams with lesson and subject info
        const formattedExams = exams.map((exam) => ({
          id: exam.id,
          title: `${exam.title} (${exam.lesson.subject.name} - ${exam.lesson.name})`,
          classId: exam.lesson.classId,
          className: exam.lesson.class.name
        }));

        // Fetch assignments - filter by teacher if role is teacher
        const assignments = await prisma.assignment.findMany({
          where: role === "teacher"
            ? {
                lesson: {
                  teacherId: currentUserId!,
                },
              }
            : {},
          select: {
            id: true,
            title: true,
            lesson: {
              select: {
                name: true,
                classId: true,
                subject: {
                  select: { name: true },
                },
                class: {
                  select: { name: true },
                },
              },
            },
          },
        });

        // Format assignments with lesson and subject info
        const formattedAssignments = assignments.map((assignment) => ({
          id: assignment.id,
          title: `${assignment.title} (${assignment.lesson.subject.name} - ${assignment.lesson.name})`,
          classId: assignment.lesson.classId,
          className: assignment.lesson.class.name
        }));

        console.log("📊 FormContainer Result Data:");
        console.log("Students count:", formattedStudents.length);
        console.log("Exams count:", formattedExams.length);
        console.log("Assignments count:", formattedAssignments.length);

        relatedData = {
          students: formattedStudents,
          exams: formattedExams,
          assignments: formattedAssignments,
          teacherClassIds, // Pass the teacher's class IDs to the form
        };
        break;
      }

      case "announcement": {
        const classes = await prisma.class.findMany({
          select: { id: true, name: true },
        });

        relatedData = {
          classes,
        };
        break;
      }

      case "attendance": {
        const students = await prisma.student.findMany({
          where:
            role === "teacher"
              ? {
                class: {
                  lessons: {
                    some: {
                      teacherId: currentUserId!,
                    },
                  },
                },
              }
              : {},
          select: {
            id: true,
            name: true,
            surname: true,
            rollNo: true,
            class: {
              select: { name: true },
            },
          },
        });
        const formattedStudents = students.map((student) => ({
          id: student.id,
          name: `${student.rollNo} ${student.name} ${student.surname}${student.class ? ` (${student.class.name})` : ""
            }`,
        }));
        relatedData = {
          students: formattedStudents,
        };
        break;
      }

      case "teacherAttendance": {
        const students = await prisma.student.findMany({
          where: role === "teacher"
            ? {
              class: {
                supervisorId: currentUserId,
              },
            }
            : {},
          select: {
            id: true,
            name: true,
            surname: true,
            rollNo: true,
            class: {
              select: { name: true },
            },
          },
        });

        const formattedStudents = students.map((student) => ({
          id: student.id,
          name: `${student.rollNo} ${student.name} ${student.surname}`
        }));

        relatedData = {
          students: formattedStudents,
        };
        break;
      }

      case "event": {
        const classes = await prisma.class.findMany({
          select: { id: true, name: true },
        });

        relatedData = {
          classes,
        };
        break;
      }
      case "incident": {
  const [behaviors, students] = await prisma.$transaction([
    prisma.behavior.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.student.findMany({
      where:
        role === "teacher"
          ? {
              class: {
                supervisorId: currentUserId!, // ✅ Use supervisor relationship
              },
            }
          : {},
      select: { 
        id: true, 
        name: true, 
        surname: true,
        rollNo: true, // Include roll number for better identification
        class: {
          select: { name: true }
        }
      },
      orderBy: [
        { class: { name: "asc" } }, // Sort by class first
        { rollNo: "asc" }           // Then by roll number
      ],
    }),
  ]);

  // Format students with roll number and class info for better identification
  const formattedStudents = students.map(student => ({
    id: student.id,
    name: `${student.rollNo} - ${student.name} ${student.surname}`,
    fullName: `${student.name} ${student.surname}`,
    rollNo: student.rollNo,
    className: student.class?.name,
    // Keep original data for form use
    originalName: student.name,
    originalSurname: student.surname,
  }));

  relatedData = { 
    behaviors, 
    students: formattedStudents, 
    currentUserId 
  };
  break;
}
      case "fee": {
        const studentClasses = await prisma.student.findMany({
          select: { id: true, name: true },
        });
        const feeType = await prisma.feeType.findMany({
          select: { id: true, name: true, defaultAmount: true },
        });

        relatedData = {
          students: studentClasses,
          feeTypes: feeType
        };
        break;
      }
      default:
        break;
    }
  }

  return (
    <div>
      <FormModal
        table={table}
        type={type}
        data={data}
        id={id}
        relatedData={relatedData}
      />
    </div>
  );
};

export default FormContainer;