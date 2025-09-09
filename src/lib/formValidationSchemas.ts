import { z } from "zod";

export const subjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Subject name is required!" }),
  teachers: z.array(z.string()), //teacher ids
});

export type SubjectSchema = z.infer<typeof subjectSchema>;

export const classSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Subject name is required!" }),
  capacity: z.coerce.number().min(1, { message: "Capacity name is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Grade name is required!" }),
  supervisorId: z.coerce
    .string()
    .min(1, { message: "Supervisor is required!" }),
});

export type ClassSchema = z.infer<typeof classSchema>;

export const teacherSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])/, {
      message:
        "Password must contain at least one uppercase letter, one lowercase letter!",
    })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "Blood Type is required!" }),
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  subjects: z.array(z.string()).optional(), // subject ids
});

export type TeacherSchema = z.infer<typeof teacherSchema>;

export const studentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  rollNo: z.number().min(1, { message: "Roll number must be at least 1" }),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "Blood Type is required!" }),
  birthday: z.coerce.string({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Grade is required!" }),
  classId: z.coerce.number().min(1, { message: "Class is required!" }),
  parentId: z.string().min(1, { message: "Parent Id is required!" }),
});

export type StudentSchema = z.infer<typeof studentSchema>;

export const examSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title name is required!" }),
  startTime: z.string().min(1, { message: "Start time is required!" }),
  endTime: z.string().min(1, { message: "End time is required!" }),

  lessonId: z.coerce.number({ message: "Lesson is required!" }),
});

export type ExamSchema = z.infer<typeof examSchema>;

export const parentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])/, {
      message:
        "Password must contain at least one uppercase letter, one lowercase letter!",
    })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .min(10, { message: "Phone number must be at least 10 digits!" })
    .max(15, { message: "Phone number must be at most 15 digits!" }),
  address: z.string().min(1, { message: "Address is required!" }),
});

export type ParentSchema = z.infer<typeof parentSchema>;

export const lessonSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Lesson name is required" }),
  day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"], {
    required_error: "Day is required",
  }),
  subjectId: z.coerce.number({ message: "Subject is required" }),
  classId: z.coerce.number({ message: "Class is required" }),
  teacherId: z.string().min(1, { message: "Teacher is required" }),
});

export type LessonSchema = z.infer<typeof lessonSchema>;

export const announcementSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  date: z.string().min(1, { message: "Date is required" }),
  classId: z.coerce.number().optional().nullable(),
});

export type AnnouncementSchema = z.infer<typeof announcementSchema>;

export const assignmentSchema = z
  .object({
    id: z.coerce.number().optional(),
    title: z
      .string()
      .min(1, { message: "Title is required!" })
      .max(100, { message: "Title must be less than 100 characters!" }),
    startDate: z
      .string()
      .min(1, { message: "Start date is required!" })
      .refine(
        (date) => {
          const parsedDate = new Date(date);
          return !isNaN(parsedDate.getTime());
        },
        { message: "Invalid start date format!" }
      ),
    dueDate: z
      .string()
      .min(1, { message: "Due date is required!" })
      .refine(
        (date) => {
          const parsedDate = new Date(date);
          return !isNaN(parsedDate.getTime());
        },
        { message: "Invalid due date format!" }
      ),
    lessonId: z.coerce.number().min(1, { message: "Lesson is required!" }),
  })
  .refine(
    (data) => {
      const startDate = new Date(data.startDate);
      const dueDate = new Date(data.dueDate);
      return dueDate >= startDate;
    },
    {
      message: "Due date must be after or equal to start date!",
      path: ["dueDate"],
    }
  );

export type AssignmentSchema = z.infer<typeof assignmentSchema>;

export const resultSchema = z
  .object({
    id: z.coerce.number().optional(),
    score: z.coerce
      .number()
      .min(0, "Score must be at least 0")
      .max(100, "Score cannot exceed 100"),
    examId: z.coerce.number().optional().nullable(),
    assignmentId: z.coerce.number().optional().nullable(),
    studentId: z.string().min(1, "Student is required"),
  })
  .refine((data) => data.examId || data.assignmentId, {
    message: "Either exam or assignment must be selected",
    path: ["examId"],
  });

export type ResultSchema = z.infer<typeof resultSchema>;

export const attendanceSchema = z.object({
  id: z.coerce.number().optional(), // 👈 Automatically parses string to number
  date: z
    .string()
    .min(1, "Date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
  present: z.coerce.boolean().refine((val) => typeof val === "boolean", {
    message: "Present must be a valid boolean value",
  }),
  studentId: z.string().min(1, "Student is required"),
});

export type AttendanceSchema = z.infer<typeof attendanceSchema>;

export const teacherAttendanceSchema = z.object({
  date: z
    .string()
    .min(1, "Date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
  attendances: z
    .array(
      z.object({
        studentId: z.string().min(1, "Student ID is required"),
        present: z.boolean(),
      })
    )
    .min(1, "At least one student must be selected"),
});

export type TeacherAttendanceSchema = z.infer<typeof teacherAttendanceSchema>;

export const eventSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  classId: z.union([z.string().min(1), z.literal("")]).optional(), // if class is optional
});

export type EventSchema = z.infer<typeof eventSchema>;

// Fee Schema
export const feeSchema = z
  .object({
    id: z.coerce.number().optional(),
    studentId: z.string().min(1, { message: "Student is required!" }),
    feeTypeId: z.coerce.number().min(1, { message: "Fee type is required!" }),
    amount: z.coerce
      .number()
      .min(0.01, { message: "Amount must be greater than 0!" }),
    dueDate: z.string().min(1, { message: "Due date is required!" }),
    academicYear: z.string().min(1, { message: "Academic year is required!" }),
    semester: z.string().min(1, { message: "Semester is required!" }),
    description: z.string().optional(),
    status: z.enum(["pending", "paid", "partial", "cancelled"], {
      message: "Please select a valid status!",
    }),
    paidAmount: z.coerce.number().min(0).optional(),
    paidDate: z.string().optional(),
    paymentMethod: z.string().optional(),
    transactionId: z.string().optional(),
  })
  .refine(
    (data) => {
      // If status is paid, paidAmount, paidDate, and paymentMethod are required
      if (data.status === "paid") {
        return (
          data.paidAmount &&
          data.paidAmount > 0 &&
          data.paidDate &&
          data.paymentMethod
        );
      }
      return true;
    },
    {
      message: "Payment details are required when status is 'Paid'",
      path: ["paidAmount"], // This will show the error on paidAmount field
    }
  )
  .refine(
    (data) => {
      // If status is paid, paid amount should equal or be close to the total amount
      if (data.status === "paid" && data.paidAmount) {
        return data.paidAmount >= data.amount;
      }
      return true;
    },
    {
      message:
        "Paid amount cannot be less than total amount for fully paid fees",
      path: ["paidAmount"],
    }
  )
  .refine(
    (data) => {
      // If status is partial, paid amount should be less than total amount
      if (data.status === "partial" && data.paidAmount) {
        return data.paidAmount < data.amount && data.paidAmount > 0;
      }
      return true;
    },
    {
      message:
        "For partial payment, paid amount must be less than total amount and greater than 0",
      path: ["paidAmount"],
    }
  )
  .refine(
    (data) => {
      // If paidAmount is provided, it shouldn't exceed the total amount
      if (data.paidAmount && data.paidAmount > 0) {
        return data.paidAmount <= data.amount;
      }
      return true;
    },
    {
      message: "Paid amount cannot exceed the total amount",
      path: ["paidAmount"],
    }
  );

export type FeeSchema = z.infer<typeof feeSchema>;

// Fee Type Schema
export const feeTypeSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Fee type name is required!" }),
  description: z.string().optional(),
  defaultAmount: z.coerce
    .number()
    .min(0, { message: "Default amount must be 0 or greater!" })
    .optional(),
  isActive: z.boolean().default(true),
});

export type FeeTypeSchema = z.infer<typeof feeTypeSchema>;

export const behaviorSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  point: z.coerce
    .number()
    .nonnegative({ message: "Number must be greater than or equal to 1" })
    .min(1, { message: "Point is required!" }),
  isNegative: z.boolean(),
});

export type BehaviorSchema = z.infer<typeof behaviorSchema>;

export const incidentSchema = z.object({
  id: z.coerce.number().optional(),
  behaviorId: z.coerce.number().min(1, { message: "Behavior is required!" }),
  studentId: z.string().min(1, { message: "Student is required!" }),
  givenById: z.coerce.string().min(1, { message: "Given by is required!" }),
  comment: z.string().min(1, { message: "Comment is required!" }),
  date: z.coerce.date({ message: "Date is required!" }),
});

export type IncidentSchema = z.infer<typeof incidentSchema>;
