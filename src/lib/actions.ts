"use server";

import prisma from "./prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  BehaviorSchema,
  EventSchema,
  feeSchema,
  FeeSchema,
  IncidentSchema,
  teacherAttendanceSchema,
  type AnnouncementSchema,
  type AssignmentSchema,
  type AttendanceSchema,
  type ClassSchema,
  type ExamSchema,
  type LessonSchema,
  type ParentSchema,
  type ResultSchema,
  type StudentSchema,
  type SubjectSchema,
  type TeacherSchema,
} from "./formValidationSchemas";
import { createErrorMessage } from "./utils";
import z from "zod";
import { revalidatePath } from "next/cache";

type CurrentState = { success: boolean; error: boolean; errorMessage?: string };

// FEE ACTIONS
export const createFee = async (
  currentState: { success: boolean; error: boolean; errorMessage?: string },
  data: FeeSchema
) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

  // Only admin and teachers can create fees
  if (role !== "admin" && role !== "teacher") {
    return { success: false, error: true, errorMessage: "Unauthorized!" };
  }

  try {
    const validatedData = feeSchema.parse(data);

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: validatedData.studentId },
    });

    if (!student) {
      return {
        success: false,
        error: true,
        errorMessage: "Student not found!",
      };
    }

    // Check if fee type exists
    const feeType = await prisma.feeType.findUnique({
      where: { id: validatedData.feeTypeId },
    });

    if (!feeType) {
      return {
        success: false,
        error: true,
        errorMessage: "Fee type not found!",
      };
    }

    // Check for duplicate fee (same student, fee type, academic year, semester)
    const existingFee = await prisma.fee.findFirst({
      where: {
        studentId: validatedData.studentId,
        feeTypeId: validatedData.feeTypeId,
        academicYear: validatedData.academicYear,
        semester: validatedData.semester,
      },
    });

    if (existingFee) {
      return {
        success: false,
        error: true,
        errorMessage:
          "Fee already exists for this student, fee type, and academic period!",
      };
    }

    // Prepare fee data
    const feeData: any = {
      studentId: validatedData.studentId,
      feeTypeId: validatedData.feeTypeId,
      amount: validatedData.amount,
      dueDate: new Date(validatedData.dueDate),
      academicYear: validatedData.academicYear,
      semester: validatedData.semester,
      description: validatedData.description || null,
      status: validatedData.status,
    };

    // Add payment details if status is paid or partial
    if (validatedData.status === "paid" || validatedData.status === "partial") {
      if (validatedData.paidAmount) {
        feeData.paidAmount = validatedData.paidAmount;
      }
      if (validatedData.paidDate) {
        feeData.paidDate = new Date(validatedData.paidDate);
      }
      if (validatedData.paymentMethod) {
        feeData.paymentMethod = validatedData.paymentMethod;
      }
      if (validatedData.transactionId) {
        feeData.transactionId = validatedData.transactionId;
      }
    }

    await prisma.fee.create({
      data: feeData,
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Error creating fee:", err);
    return {
      success: false,
      error: true,
      errorMessage:
        err instanceof Error ? err.message : "Something went wrong!",
    };
  }
};

export const updateFee = async (
  currentState: { success: boolean; error: boolean; errorMessage?: string },
  data: FeeSchema
) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

  // Only admin and teachers can update fees
  if (role !== "admin" && role !== "teacher") {
    return { success: false, error: true, errorMessage: "Unauthorized!" };
  }

  try {
    const validatedData = feeSchema.parse(data);

    if (!validatedData.id) {
      return {
        success: false,
        error: true,
        errorMessage: "Fee ID is required!",
      };
    }

    // Check if fee exists
    const existingFee = await prisma.fee.findUnique({
      where: { id: validatedData.id },
    });

    if (!existingFee) {
      return { success: false, error: true, errorMessage: "Fee not found!" };
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: validatedData.studentId },
    });

    if (!student) {
      return {
        success: false,
        error: true,
        errorMessage: "Student not found!",
      };
    }

    // Check if fee type exists
    const feeType = await prisma.feeType.findUnique({
      where: { id: validatedData.feeTypeId },
    });

    if (!feeType) {
      return {
        success: false,
        error: true,
        errorMessage: "Fee type not found!",
      };
    }

    // Check for duplicate fee (only if changing key fields)
    if (
      existingFee.studentId !== validatedData.studentId ||
      existingFee.feeTypeId !== validatedData.feeTypeId ||
      existingFee.academicYear !== validatedData.academicYear ||
      existingFee.semester !== validatedData.semester
    ) {
      const duplicateFee = await prisma.fee.findFirst({
        where: {
          studentId: validatedData.studentId,
          feeTypeId: validatedData.feeTypeId,
          academicYear: validatedData.academicYear,
          semester: validatedData.semester,
          id: { not: validatedData.id },
        },
      });

      if (duplicateFee) {
        return {
          success: false,
          error: true,
          errorMessage:
            "Another fee already exists for this student, fee type, and academic period!",
        };
      }
    }

    // Prepare update data
    const updateData: any = {
      studentId: validatedData.studentId,
      feeTypeId: validatedData.feeTypeId,
      amount: validatedData.amount,
      dueDate: new Date(validatedData.dueDate),
      academicYear: validatedData.academicYear,
      semester: validatedData.semester,
      description: validatedData.description || null,
      status: validatedData.status,
    };

    // Handle payment details based on status
    if (validatedData.status === "paid" || validatedData.status === "partial") {
      if (validatedData.paidAmount) {
        updateData.paidAmount = validatedData.paidAmount;
      }
      if (validatedData.paidDate) {
        updateData.paidDate = new Date(validatedData.paidDate);
      }
      if (validatedData.paymentMethod) {
        updateData.paymentMethod = validatedData.paymentMethod;
      }
      if (validatedData.transactionId) {
        updateData.transactionId = validatedData.transactionId;
      }
    } else {
      // Clear payment details if status is not paid or partial
      updateData.paidAmount = null;
      updateData.paidDate = null;
      updateData.paymentMethod = null;
      updateData.transactionId = null;
    }

    await prisma.fee.update({
      where: { id: validatedData.id },
      data: updateData,
    });

    revalidatePath("/list/finance");
    return { success: true, error: false };
  } catch (err) {
    console.error("Error updating fee:", err);
    return {
      success: false,
      error: true,
      errorMessage:
        err instanceof Error ? err.message : "Something went wrong!",
    };
  }
};

export const deleteFee = async (
  currentState: { success: boolean; error: boolean },
  data: FormData
): Promise<CurrentState> => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

  // Only admin and teachers can delete fees
  if (role !== "admin" && role !== "teacher") {
    return { success: false, error: true };
  }

  const id = data.get("id") as string;

  try {
    // Check if fee exists
    const existingFee = await prisma.fee.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingFee) {
      return { success: false, error: true };
    }

    await prisma.fee.delete({
      where: { id: parseInt(id) },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Error deleting fee:", err);
    return { success: false, error: true };
  }
};

// TEACHER ACTIONS
export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
): Promise<CurrentState> => {
  let user;

  try {
    const clerk = await clerkClient();

    // 1. Create Clerk user first
    user = await clerk.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      emailAddress: data.email ? [data.email] : [],
      publicMetadata: { role: "teacher" },
    });

    if (data.img) {
      try {
        const response = await fetch(data.img);
        if (!response.ok)
          throw new Error(`Failed to fetch image: ${response.statusText}`);

        const buffer = await response.arrayBuffer();

        // Extract file extension from URL or use a more sophisticated detection
        const fileExt = data.img.split(".").pop()?.toLowerCase() || "png";
        const mimeType = `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

        const file = new File([buffer], `profile.${fileExt}`, {
          type: mimeType,
        });

        await clerk.users.updateUserProfileImage(user.id, { file });
      } catch (imgError) {
        console.error("Failed to update profile image:", imgError);
      }
    }

    // 2. Then create in your own DB
    await prisma.teacher.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: new Date(data.birthday),
        subjects: {
          connect: data.subjects?.map((subjectId: string) => ({
            id: Number.parseInt(subjectId),
          })),
        },
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    // If Prisma failed but Clerk user was created, clean up
    if (user) {
      try {
        const clerk = await clerkClient();
        await clerk.users.deleteUser(user.id);
      } catch (cleanupError) {
        console.error("Failed to rollback Clerk user:", cleanupError);
      }
    }

    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    const clerk = await clerkClient();

    // Update basic user info
    await clerk.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    // Update email in Clerk if provided
    if (data.email) {
      try {
        const user = await clerk.users.getUser(data.id);
        const primaryEmail = user.emailAddresses.find(
          (email) => email.id === user.primaryEmailAddressId
        );

        // Only update if email is different
        if (primaryEmail && primaryEmail.emailAddress !== data.email) {
          // Create new email address
          const newEmailAddress = await clerk.emailAddresses.createEmailAddress(
            {
              userId: data.id,
              emailAddress: data.email,
              verified: true,
            }
          );

          // Set as primary email address
          await clerk.users.updateUser(data.id, {
            primaryEmailAddressID: newEmailAddress.id,
          });

          // Delete the old email address (optional)
          if (primaryEmail) {
            await clerk.emailAddresses.deleteEmailAddress(primaryEmail.id);
          }
        }
      } catch (emailError) {
        console.log("Email update error:", emailError);
        // Continue even if email update fails
      }
    }

    if (data.img) {
      try {
        const response = await fetch(data.img);
        if (!response.ok)
          throw new Error(`Failed to fetch image: ${response.statusText}`);

        const buffer = await response.arrayBuffer();
        const fileExt = data.img.split(".").pop()?.toLowerCase() || "png";
        const mimeType = `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;
        const file = new File([buffer], `profile.${fileExt}`, {
          type: mimeType,
        });

        await clerk.users.updateUserProfileImage(data.id, { file });
      } catch (imgError) {
        console.error("Failed to update student profile image:", imgError);
      }
    }

    await prisma.teacher.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: new Date(data.birthday),
        subjects: {
          set: data.subjects?.map((subjectId: string) => ({
            id: Number.parseInt(subjectId),
          })),
        },
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;

  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(id);

    await prisma.teacher.delete({
      where: {
        id: id,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

// STUDENT ACTIONS
export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
): Promise<CurrentState> => {
  let user;
  try {
    const clerk = await clerkClient();

    // 1. Create Clerk user
    user = await clerk.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      emailAddress: data.email ? [data.email] : [],
      publicMetadata: { role: "student" },
    });

    // 2. Handle profile image if provided
    if (data.img) {
      try {
        const response = await fetch(data.img);
        if (!response.ok)
          throw new Error(`Failed to fetch image: ${response.statusText}`);

        const buffer = await response.arrayBuffer();
        const fileExt = data.img.split(".").pop()?.toLowerCase() || "png";
        const mimeType = `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;
        const file = new File([buffer], `profile.${fileExt}`, {
          type: mimeType,
        });

        await clerk.users.updateUserProfileImage(user.id, { file });
      } catch (imgError) {
        console.error("Failed to update student profile image:", imgError);
      }
    }

    // 3. Create in Prisma
    await prisma.student.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        rollNo: data.rollNo,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: new Date(data.birthday),
        classId: data.classId,
        gradeId: data.gradeId,
        parentId: data.parentId,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    // Cleanup if Prisma fails but Clerk user was created
    if (user) {
      try {
        const clerk = await clerkClient();
        await clerk.users.deleteUser(user.id);
      } catch (cleanupError) {
        console.error("Failed to rollback Clerk user:", cleanupError);
      }
    }

    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    const clerk = await clerkClient();

    // 1. Update Clerk user info
    await clerk.users.updateUser(data.id, {
      username: data.username,
      ...(data.password && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    // 2. Handle email update if changed
    if (data.email) {
      try {
        const user = await clerk.users.getUser(data.id);
        const primaryEmail = user.emailAddresses.find(
          (email) => email.id === user.primaryEmailAddressId
        );

        if (primaryEmail && primaryEmail.emailAddress !== data.email) {
          const newEmail = await clerk.emailAddresses.createEmailAddress({
            userId: data.id,
            emailAddress: data.email,
            verified: true,
          });
          await clerk.users.updateUser(data.id, {
            primaryEmailAddressID: newEmail.id,
          });
          if (primaryEmail) {
            await clerk.emailAddresses.deleteEmailAddress(primaryEmail.id);
          }
        }
      } catch (emailError) {
        console.error("Email update error:", emailError);
      }
    }

    // 3. Handle profile image update if changed
    if (data.img) {
      try {
        const response = await fetch(data.img);
        if (!response.ok)
          throw new Error(`Failed to fetch image: ${response.statusText}`);

        const buffer = await response.arrayBuffer();
        const fileExt = data.img.split(".").pop()?.toLowerCase() || "png";
        const mimeType = `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;
        const file = new File([buffer], `profile.${fileExt}`, {
          type: mimeType,
        });

        await clerk.users.updateUserProfileImage(data.id, { file });

        await prisma.student.update({
          where: { id: data.id },
          data: {
            img: data.img,
          },
        });
      } catch (imgError) {
        console.error("Failed to update student profile image:", imgError);
      }
    }

    // 4. Update in Prisma
    await prisma.student.update({
      where: { id: data.id },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: new Date(data.birthday),
        parentId: data.parentId,
        classId: Number(data.classId),
        gradeId: Number(data.gradeId),
        rollNo: data.rollNo,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Student update failed:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(id);

    await prisma.student.delete({
      where: {
        id: id,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// PARENT ACTIONS
export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema
): Promise<CurrentState> => {
  let user;

  try {
    const clerk = await clerkClient();

    user = await clerk.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      emailAddress: data.email ? [data.email] : [],
      publicMetadata: { role: "parent" },
    });

    await prisma.parent.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    if (user) {
      try {
        const clerk = await clerkClient();
        await clerk.users.deleteUser(user.id);
      } catch (cleanupError) {
        console.error("Failed to rollback Clerk user:", cleanupError);
      }
    }

    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const updateParent = async (
  currentState: CurrentState,
  data: ParentSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    const clerk = await clerkClient();

    // Update Clerk user info
    await clerk.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    // Email update logic (if provided)
    if (data.email) {
      try {
        const user = await clerk.users.getUser(data.id);
        const primaryEmail = user.emailAddresses.find(
          (email) => email.id === user.primaryEmailAddressId
        );

        if (primaryEmail && primaryEmail.emailAddress !== data.email) {
          const newEmail = await clerk.emailAddresses.createEmailAddress({
            userId: data.id,
            emailAddress: data.email,
            verified: true,
          });

          await clerk.users.updateUser(data.id, {
            primaryEmailAddressID: newEmail.id,
          });

          await clerk.emailAddresses.deleteEmailAddress(primaryEmail.id);
        }
      } catch (emailError) {
        console.log("Email update error:", emailError);
      }
    }

    // Update parent in Prisma
    await prisma.parent.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Parent update error:", err);
    return { success: false, error: true };
  }
};

export const deleteParent = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;

  try {
    const clerk = await clerkClient();

    // Delete from Clerk
    await clerk.users.deleteUser(id);

    // Delete from Prisma
    await prisma.parent.delete({
      where: {
        id: id,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Parent deletion failed:", err);
    const errorMessage = createErrorMessage(err); // Optional error handler
    return { success: false, error: true, errorMessage };
  }
};

// SUBJECT ACTIONS
export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
): Promise<CurrentState> => {
  try {
    console.log("data:", data);
    await prisma.subject.create({
      data: {
        name: data.name,
        teachers: {
          connect: data.teachers?.map((teacherId: string) => ({
            id: teacherId,
          })),
        },
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Create subject error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      errorMessage: "Subject ID is required for update",
    };
  }

  try {
    await prisma.subject.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        teachers: {
          set: [], // Clear existing connections
          connect: data.teachers?.map((teacherId: string) => ({
            id: teacherId,
          })),
        },
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Update subject error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  try {
    const id = Number(data.get("id"));

    await prisma.subject.delete({ where: { id } });
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true };
  }
};

// CLASS ACTIONS
export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema
): Promise<CurrentState> => {
  try {
    console.log("data:", data);
    await prisma.class.create({
      data: {
        name: data.name,
        capacity: data.capacity,
        supervisorId: data.supervisorId,
        gradeId: data.gradeId,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Create class error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      errorMessage: "Class ID is required for update",
    };
  }

  try {
    console.log("update data:", data);
    await prisma.class.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        capacity: data.capacity,
        supervisorId: data.supervisorId,
        gradeId: data.gradeId,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Update class error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  try {
    const id = Number(data.get("id"));

    await prisma.class.delete({ where: { id } });
    return { success: true, error: false };
  } catch (error) {
    const errorMessage = createErrorMessage(error);
    return { success: false, error: true, errorMessage };
  }
};

// EXAM ACTIONS
export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema
): Promise<CurrentState> => {
  try {
    await prisma.exam.create({
      data: {
        title: data.title,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        lessonId: data.lessonId,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Create exam error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      errorMessage: "Exam ID is required for update",
    };
  }

  try {
    console.log("update data:", data);
    await prisma.exam.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        lessonId: data.lessonId,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Update exam error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  try {
    const id = Number(data.get("id"));

    await prisma.exam.delete({ where: { id } });
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    const errorMessage = createErrorMessage(error);
    return { success: false, error: true, errorMessage };
  }
};

// LESSON ACTIONS
export const createLesson = async (
  currentState: CurrentState,
  data: LessonSchema
): Promise<CurrentState> => {
  try {
    await prisma.lesson.create({
      data: {
        name: data.name,
        day: data.day,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Create lesson error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const updateLesson = async (
  currentState: CurrentState,
  data: LessonSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      errorMessage: "Lesson ID is required for update",
    };
  }

  try {
    await prisma.lesson.update({
      where: { id: data.id },
      data: {
        name: data.name,
        day: data.day,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Update lesson error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const deleteLesson = async (
  currentState: CurrentState,
  formData: FormData
): Promise<CurrentState> => {
  try {
    const id = Number(formData.get("id"));
    await prisma.lesson.delete({ where: { id } });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Delete lesson error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

// ANNOUNCEMENT ACTIONS
export const createAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema
): Promise<CurrentState> => {
  try {
    const { userId } = await auth();

    const result = await prisma.announcement.create({
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        classId: data.classId || null,
      },
    });
    try {
      await markAnnouncementAsViewed(userId!, result.id);
    } catch (error) {
      throw error;
    }
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const updateAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      errorMessage: "Announcement ID is required",
    };
  }

  try {
    await prisma.announcement.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        classId: data.classId || null,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const deleteAnnouncement = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;

  if (!id) {
    return {
      success: false,
      error: true,
      errorMessage: "Announcement ID is required",
    };
  }

  try {
    await prisma.announcement.delete({
      where: {
        id: parseInt(id),
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

// ASSIGNMENT ACTIONS
export const createAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
): Promise<CurrentState> => {
  try {
    await prisma.assignment.create({
      data: {
        title: data.title,
        startDate: new Date(data.startDate),
        dueDate: new Date(data.dueDate),
        lessonId: data.lessonId,
      },
    });
    return { success: true, error: false };
  } catch (err: any) {
    console.error("Create assignment error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const updateAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      errorMessage: "Assignment ID is required for update",
    };
  }

  try {
    await prisma.assignment.update({
      where: { id: data.id },
      data: {
        title: data.title,
        startDate: new Date(data.startDate),
        dueDate: new Date(data.dueDate),
        lessonId: data.lessonId,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Update assignment error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const deleteAssignment = async (
  currentState: CurrentState,
  formData: FormData
): Promise<CurrentState> => {
  try {
    const id = Number(formData.get("id"));
    await prisma.assignment.delete({ where: { id } });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Delete assignment error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

// RESULT ACTIONS
export const createResult = async (
  currentState: CurrentState,
  data: ResultSchema
): Promise<CurrentState> => {
  try {
    await prisma.result.create({
      data: {
        score: data.score,
        examId: data.examId || null,
        assignmentId: data.assignmentId || null,
        studentId: data.studentId,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Create result error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const updateResult = async (
  currentState: CurrentState,
  data: ResultSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      errorMessage: "Result ID is required for update",
    };
  }

  try {
    await prisma.result.update({
      where: { id: data.id },
      data: {
        score: data.score,
        examId: data.examId || null,
        assignmentId: data.assignmentId || null,
        studentId: data.studentId,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Update result error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const deleteResult = async (
  currentState: CurrentState,
  formData: FormData
): Promise<CurrentState> => {
  try {
    const id = Number(formData.get("id"));
    await prisma.result.delete({ where: { id } });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Delete result error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

// ATTENDANCE ACTIONS
export const createAttendance = async (
  currentState: CurrentState,
  data: AttendanceSchema
): Promise<CurrentState> => {
  try {
    const attendanceDate = new Date(data.date);

    // 1. Check if attendance already exists for the same student and date
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: data.studentId,
        date: {
          gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
          lt: new Date(attendanceDate.setHours(24, 0, 0, 0)),
        },
      },
    });

    if (existingAttendance) {
      return {
        success: false,
        error: true,
        errorMessage:
          "Attendance for this student on this date already exists.",
      };
    }

    // 2. Proceed to create if not exists
    await prisma.attendance.create({
      data: {
        date: new Date(data.date),
        present: data.present,
        studentId: data.studentId,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Create attendance error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const updateAttendance = async (
  currentState: CurrentState,
  data: AttendanceSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      errorMessage: "Attendance ID is required for update",
    };
  }
  console.log("update atten:", data);
  try {
    await prisma.attendance.update({
      where: { id: data.id },
      data: {
        date: new Date(data.date),
        present: data.present,
        studentId: data.studentId,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Update attendance error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};

export const deleteAttendance = async (
  currentState: CurrentState,
  formData: FormData
): Promise<CurrentState> => {
  try {
    const id = Number(formData.get("id"));
    await prisma.attendance.delete({ where: { id } });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Delete attendance error:", err);
    const errorMessage = createErrorMessage(err);
    return { success: false, error: true, errorMessage };
  }
};
export const createAttendances = async (
  currentState: CurrentState,
  data: {
    date: string;
    attendances: { studentId: string; present: boolean }[];
  }
): Promise<CurrentState> => {
  try {
    const parsedData = teacherAttendanceSchema.parse(data);
    const attendanceDate = new Date(parsedData.date);
    const studentIds = parsedData.attendances.map((a) => a.studentId);

    // 1. Check for existing attendance records
    const existingAttendances = await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        date: {
          gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
          lt: new Date(attendanceDate.setHours(24, 0, 0, 0)),
        },
      },
    });

    if (existingAttendances.length > 0) {
      const alreadyMarked = existingAttendances
        .map((ea) => ea.studentId)
        .join(", ");
      return {
        success: false,
        error: true,
        errorMessage: `Attendance already exists on the same date for the following students: ${alreadyMarked}.`,
      };
    }

    // 2. Proceed with creation
    await prisma.$transaction(
      parsedData.attendances.map((attendance) =>
        prisma.attendance.create({
          data: {
            date: new Date(parsedData.date),
            present: attendance.present,
            studentId: attendance.studentId,
          },
        })
      )
    );

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Create attendances error:", err);
    const errorMessage =
      err instanceof z.ZodError
        ? err.errors.map((e) => e.message).join(", ")
        : "An error occurred while recording attendances";
    return { success: false, error: true, errorMessage };
  }
};

// EVENT ACTIONS
export const createEvent = async (
  currentState: CurrentState,
  data: EventSchema
): Promise<CurrentState> => {
  try {
    console.log("event:", data);
    await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        classId: data.classId ? Number(data.classId) : null,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Create event error:", err);
    return {
      success: false,
      error: true,
      errorMessage: createErrorMessage(err),
    };
  }
};

export const updateEvent = async (
  currentState: CurrentState,
  data: EventSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return { success: false, error: true, errorMessage: "Missing event ID" };
  }

  try {
    await prisma.event.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        classId: data.classId ? Number(data.classId) : null,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Update event error:", err);
    return {
      success: false,
      error: true,
      errorMessage: createErrorMessage(err),
    };
  }
};

export const deleteEvent = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = Number(data.get("id"));
  try {
    await prisma.event.delete({ where: { id } });
    return { success: true, error: false };
  } catch (err: any) {
    return {
      success: false,
      error: true,
      errorMessage: createErrorMessage(err),
    };
  }
};

// UTILITY FUNCTIONS
export async function markAnnouncementAsViewed(
  userId: string,
  announcementId: number
): Promise<void> {
  await prisma.announcementView.upsert({
    where: {
      userId_announcementId: {
        userId,
        announcementId,
      },
    },
    create: {
      userId,
      announcementId,
    },
    update: {
      viewedAt: new Date(),
    },
  });
}

export async function markMultipleAnnouncementsAsViewed(
  userId: string,
  announcementIds: number[]
): Promise<void> {
  // Use createMany with skipDuplicates to handle bulk insertion
  await prisma.announcementView.createMany({
    data: announcementIds.map((announcementId) => ({
      userId,
      announcementId,
    })),
    skipDuplicates: true,
  });
}

export const createBehavior = async (
  currentState: CurrentState,
  data: BehaviorSchema
): Promise<CurrentState> => {
  try {
    const { description, point, isNegative, title } = data;
    await prisma.behavior.create({
      data: {
        title,
        description: description ?? "",
        point,
        isNegative,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Create behavior error:", err);
    return {
      success: false,
      error: true,
      errorMessage: createErrorMessage(err),
    };
  }
};

export const updateBehavior = async (
  currentState: CurrentState,
  data: BehaviorSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return { success: false, error: true, errorMessage: "Missing behavior ID" };
  }
  const { description, point, isNegative, title, id } = data;
  try {
    await prisma.behavior.update({
      where: { id },
      data: {
        title,
        description,
        point,
        isNegative,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Update behavior error:", err);
    return {
      success: false,
      error: true,
      errorMessage: createErrorMessage(err),
    };
  }
};

export const deleteBehavior = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = Number(data.get("id"));
  try {
    await prisma.behavior.delete({ where: { id } });
    return { success: true, error: false };
  } catch (err: any) {
    return {
      success: false,
      error: true,
      errorMessage: createErrorMessage(err),
    };
  }
};

export const createIncident = async (
  currentState: CurrentState,
  data: IncidentSchema
): Promise<CurrentState> => {
  try {
    const { behaviorId, studentId, givenById, comment, date } = data;

    await prisma.incident.create({
      data: {
        behaviorId,
        studentId,
        givenById,
        comment,
        date,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Create incident error:", err);
    return {
      success: false,
      error: true,
      errorMessage: createErrorMessage(err),
    };
  }
};

export const updateIncident = async (
  currentState: CurrentState,
  data: IncidentSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return { success: false, error: true, errorMessage: "Missing incident ID" };
  }

  const { behaviorId, studentId, givenById, comment, date, id } = data;

  try {
    await prisma.incident.update({
      where: { id },
      data: {
        behaviorId,
        studentId,
        givenById,
        comment,
        date,
      },
    });

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Update incident error:", err);
    return {
      success: false,
      error: true,
      errorMessage: createErrorMessage(err),
    };
  }
};

export const deleteIncident = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = Number(data.get("id"));
  try {
    await prisma.incident.delete({ where: { id } });
    return { success: true, error: false };
  } catch (err: any) {
    return {
      success: false,
      error: true,
      errorMessage: createErrorMessage(err),
    };
  }
};
