"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useTransition } from "react";
import { toast } from "react-toastify";
import { resultSchema, type ResultSchema } from "@/lib/formValidationSchemas";
import { createResult, updateResult } from "@/lib/actions";

const ResultForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: (open: boolean) => void;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ResultSchema>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      id: data?.id || "",
      score: data?.score || "",
      examId: data?.examId || undefined,
      assignmentId: data?.assignmentId || undefined,
      studentId: data?.studentId || "",
    },
  });

  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(
    type === "create" ? createResult : updateResult,
    {
      success: false,
      error: false,
      errorMessage: "",
    }
  );

  const router = useRouter();
  const {
    students = [],
    exams = [],
    assignments = [],
    teacherClassIds,
  } = relatedData || {};

  // Filter students based on teacher's assigned classes
  const filteredStudents = useMemo(() => {
    if (!teacherClassIds || teacherClassIds.length === 0) {
      // If no teacher class filter is provided, return all students (admin view)
      return students;
    }

    // Filter students who belong to the teacher's assigned classes
    return students.filter(
      (student: { id: string; name: string; classId?: number }) =>
        student.classId && teacherClassIds.includes(student.classId)
    );
  }, [students, teacherClassIds]);

  // Similarly, filter exams and assignments for teacher's classes
  const filteredExams = useMemo(() => {
    if (!teacherClassIds || teacherClassIds.length === 0) {
      return exams;
    }

    return exams.filter(
      (exam: { id: number; title: string; classId?: number }) =>
        exam.classId && teacherClassIds.includes(exam.classId)
    );
  }, [exams, teacherClassIds]);

  const filteredAssignments = useMemo(() => {
    if (!teacherClassIds || teacherClassIds.length === 0) {
      return assignments;
    }

    return assignments.filter(
      (assignment: { id: number; title: string; classId?: number }) =>
        assignment.classId && teacherClassIds.includes(assignment.classId)
    );
  }, [assignments, teacherClassIds]);

  const examId = watch("examId");
  const assignmentId = watch("assignmentId");

  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setValue("examId", value ? Number(value) : undefined);
    if (value) setValue("assignmentId", undefined);
  };

  const handleAssignmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setValue("assignmentId", value ? Number(value) : undefined);
    if (value) setValue("examId", undefined);
  };

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction(formData);
    });
  });

  useEffect(() => {
    if (state.success) {
      toast.success(
        `Result has been ${type === "create" ? "created" : "updated"}!`
      );
      setOpen(false);
      router.refresh();
    }
  }, [state, type, setOpen, router]);

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-semibold">
        {type === "create" ? "Create Result" : "Update Result"}
      </h2>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">
          Result Information
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Student</label>
            <select
              {...register("studentId")}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select Student</option>
              {filteredStudents?.map(
                (student: { id: string; name: string; className?: string }) => (
                  <option key={student.id} value={student.id}>
                    {student.name}{" "}
                    {student.className && `(${student.className})`}
                  </option>
                )
              )}
            </select>
            {errors.studentId && (
              <p className="text-xs text-red-500 mt-1">
                {errors.studentId.message}
              </p>
            )}
            {filteredStudents.length === 0 && teacherClassIds && (
              <p className="text-xs text-gray-500 mt-1">
                No students found in your assigned classes
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Score</label>
            <input
              type="number"
              {...register("score", { valueAsNumber: true })}
              className="w-full p-2 border rounded"
              required
            />
            {errors.score && (
              <p className="text-xs text-red-500 mt-1">
                {errors.score.message}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">
          Assessment
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Exam</label>
            <select
              value={examId || ""}
              onChange={handleExamChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Exam</option>
              {filteredExams?.map(
                (exam: { id: number; title: string; className?: string }) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} {exam.className && `(${exam.className})`}
                  </option>
                )
              )}
            </select>
            {errors.examId && (
              <p className="text-xs text-red-500 mt-1">
                {errors.examId.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Assignment</label>
            <select
              value={assignmentId || ""}
              onChange={handleAssignmentChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Assignment</option>
              {filteredAssignments?.map(
                (assignment: {
                  id: number;
                  title: string;
                  className?: string;
                }) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.title}{" "}
                    {assignment.className && `(${assignment.className})`}
                  </option>
                )
              )}
            </select>
            {errors.assignmentId && (
              <p className="text-xs text-red-500 mt-1">
                {errors.assignmentId.message}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {data?.id && <input type="hidden" {...register("id")} />}

      {state.error && state.errorMessage && (
        <p className="text-red-500 text-sm">{state.errorMessage}</p>
      )}

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isPending
            ? type === "create"
              ? "Creating..."
              : "Updating..."
            : type === "create"
            ? "Create"
            : "Update"}
        </button>
      </div>
    </form>
  );
};

export default ResultForm;
