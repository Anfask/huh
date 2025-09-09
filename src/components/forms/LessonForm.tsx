
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { lessonSchema, type LessonSchema } from "@/lib/formValidationSchemas";
import { createLesson, updateLesson } from "@/lib/actions";
import { useActionState, useTransition } from "react";
import { Dispatch, SetStateAction } from "react";
import { toast } from "react-toastify";

const LessonForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData: {
    subjects: { id: number; name: string }[];
    classes: { id: number; name: string }[];
    teachers: { id: string; name: string }[];
  };
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LessonSchema>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      name: data?.name || "",
      day: data?.day || "",
      subjectId: data?.subjectId || undefined,
      classId: data?.classId || undefined,
      teacherId: data?.teacherId || "",
      id: data?.id || undefined,
    },
  });

  const [state, formAction] = useActionState(
    type === "create" ? createLesson : updateLesson,
    {
      success: false,
      error: false,
      errorMessage: "",
    }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { subjects = [], classes = [], teachers = [] } = relatedData || {};

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction(formData);
    });
  });

  useEffect(() => {
    if (state.success) {
      toast(`Lesson has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, setOpen, type]);

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-semibold">
        {type === "create" ? "Create Lesson" : "Update Lesson"}
      </h2>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">Basic Information</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Lesson Name</label>
            <input
              {...register("name")}
              className="w-full p-2 border rounded"
              required
            />
            {errors.name?.message && (
              <p className="text-xs text-red-400 mt-1">
                {errors.name.message.toString()}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Day</label>
            <select
              {...register("day")}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Day</option>  
              {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY","SATURDAY"].map(
                (day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                )
              )}
            </select>
            {errors.day?.message && (
              <p className="text-xs text-red-400 mt-1">
                {errors.day.message.toString()}
              </p>
            )}
          </div>
        </div>
      </fieldset>


      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">Assignments</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <select
              {...register("subjectId")}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.subjectId?.message && (
              <p className="text-xs text-red-400 mt-1">
                {errors.subjectId.message.toString()}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Class</label>
            <select
              {...register("classId")}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.classId?.message && (
              <p className="text-xs text-red-400 mt-1">
                {errors.classId.message.toString()}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Teacher</label>
            <select
              {...register("teacherId")}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {errors.teacherId?.message && (
              <p className="text-xs text-red-400 mt-1">
                {errors.teacherId.message.toString()}
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

export default LessonForm;
