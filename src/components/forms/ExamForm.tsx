"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { examSchema, type ExamSchema } from "@/lib/formValidationSchemas";
import { createExam, updateExam } from "@/lib/actions";
import { useActionState, useTransition } from "react";
import { Dispatch, SetStateAction } from "react";
import { toast } from "react-toastify";

function formatDatetimeLocal(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, "0");

  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());

  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

const ExamForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExamSchema>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: data?.title || "",
      startTime: data?.startTime ? formatDatetimeLocal(data.startTime) : "",
      endTime: data?.endTime ? formatDatetimeLocal(data.endTime) : "",
      lessonId: data?.lessonId || 0,
      id: data?.id || undefined,
    },
  });

  const [state, formAction] = useActionState(
    type === "create" ? createExam : updateExam,
    {
      success: false,
      error: false,
      errorMessage: "",
    }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { lessons = [] } = relatedData || {};

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction(formData);
    });
  });

  useEffect(() => {
    if (state.success) {
      toast(`Exam has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, setOpen, type]);

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-semibold">
        {type === "create" ? "Create Exam" : "Update Exam"}
      </h2>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">Exam Information</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Exam Title</label>
            <input
              {...register("title")}
              className="w-full p-2 border rounded"
              required
            />
            {errors.title?.message && (
              <p className="text-xs text-red-400 mt-1">
                {errors.title.message.toString()}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Lesson</label>
            <select
              {...register("lessonId", { valueAsNumber: true })}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a lesson</option>
              {lessons.map((lesson: { id: number; name: string }) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.name}
                </option>
              ))}
            </select>
            {errors.lessonId?.message && (
              <p className="text-xs text-red-400 mt-1">
                {errors.lessonId.message.toString()}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">Exam Schedule</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Time</label>
            <input
              type="datetime-local"
              {...register("startTime")}
              className="w-full p-2 border rounded"
              required
            />
            {errors.startTime?.message && (
              <p className="text-xs text-red-400 mt-1">
                {errors.startTime.message.toString()}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">End Time</label>
            <input
              type="datetime-local"
              {...register("endTime")}
              className="w-full p-2 border rounded"
              required
            />
            {errors.endTime?.message && (
              <p className="text-xs text-red-400 mt-1">
                {errors.endTime.message.toString()}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {data?.id && (
        <input type="hidden" {...register("id")} />
      )}

      {(state.error && state.errorMessage) && (
        <p className="text-red-500 text-sm">{state.errorMessage}</p>
      )}
      {(state.error && !state.errorMessage) && (
        <p className="text-red-500 text-sm">Something went wrong!</p>
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

export default ExamForm;