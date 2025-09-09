"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  assignmentSchema,
  type AssignmentSchema,
} from "@/lib/formValidationSchemas";
import { createAssignment, updateAssignment } from "@/lib/actions";
import { useActionState, useTransition } from "react";

const AssignmentForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: (open: boolean) => void;
  relatedData?: {
    lessons?: {
      id: number;
      name: string;
      subject: { name: string };
      class: { name: string };
    }[];
  };
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AssignmentSchema>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: data?.title || "",
      startDate: data?.startDate ? new Date(data.startDate).toISOString().split("T")[0] : "",
      dueDate: data?.dueDate ? new Date(data.dueDate).toISOString().split("T")[0] : "",
      lessonId: data?.lessonId || "",
      id: data?.id || "",
    },
  });

  const [state, formAction] = useActionState(
    type === "create" ? createAssignment : updateAssignment,
    {
      success: false,
      error: false,
      errorMessage: "",
    }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction(formData);
    });
  });

  useEffect(() => {
    if (state.success) {
      toast.success(
        `Assignment has been ${type === "create" ? "created" : "updated"}!`
      );
      setOpen(false);
      router.refresh();
    }
  }, [state, type, setOpen, router]);

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-semibold">
        {type === "create" ? "Create Assignment" : "Update Assignment"}
      </h2>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">Assignment Information</legend>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              {...register("title")}
              className="w-full p-2 border rounded"
              required
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Lesson</label>
            <select
              {...register("lessonId")}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select a lesson</option>
              {relatedData?.lessons?.map((lesson) => (
                <option value={lesson.id} key={lesson.id}>
                  {lesson.name} - {lesson.subject.name} ({lesson.class.name})
                </option>
              ))}
            </select>
            {errors.lessonId && (
              <p className="text-xs text-red-500 mt-1">{errors.lessonId.message}</p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">Schedule Information</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              {...register("startDate")}
              className="w-full p-2 border rounded"
              required
            />
            {errors.startDate && (
              <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              {...register("dueDate")}
              className="w-full p-2 border rounded"
              required
            />
            {errors.dueDate && (
              <p className="text-xs text-red-500 mt-1">{errors.dueDate.message}</p>
            )}
          </div>
        </div>
      </fieldset>

      {data?.id && (
        <input type="hidden" {...register("id")} />
      )}

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

export default AssignmentForm;