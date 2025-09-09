"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-toastify";
import {
  incidentSchema,
  type IncidentSchema,
} from "@/lib/formValidationSchemas";
import { createIncident, updateIncident } from "@/lib/actions";

const IncidentForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: IncidentSchema & {
    behavior?: { title: string };
    student?: { name: string; surname: string };
  };
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  relatedData?: {
    behaviors: { id: number; title: string }[];
    students: { id: string; name: string; surname: string }[];
    teachers: { id: number; name: string; surname: string }[];
    currentUserId: string;
    currentUserRole: string;
    teacherClassId?: number;
  };
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IncidentSchema>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      id: data?.id || undefined,
      behaviorId: data?.behaviorId || undefined,
      studentId: data?.studentId || undefined,
      givenById: data?.givenById || relatedData?.currentUserId,
      comment: data?.comment || "",
      date: data?.date
        ? new Date(new Date(data.date).toISOString().split("T")[0])
        : undefined,
    },
  });

  const [state, formAction] = useActionState(
    type === "create" ? createIncident : updateIncident,
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
      toast(`Incident has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, type, setOpen, router]);

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-semibold">
        {type === "create"
          ? "Create Student Incident"
          : "Update Student Incident"}
      </h2>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">
          Incident Information
        </legend>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Behavior Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Behavior</label>
            <select
              {...register("behaviorId")}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a behavior</option>
              {relatedData?.behaviors?.map((behavior) => (
                <option key={behavior.id} value={behavior.id}>
                  {behavior.title}
                </option>
              ))}
            </select>
            {errors.behaviorId && (
              <p className="text-red-500 text-xs mt-1">
                {errors.behaviorId.message}
              </p>
            )}
          </div>

          {/* Student Selection - filtered based on role */}
          <div>
            <label className="block text-sm font-medium mb-1">Student</label>
            <select
              {...register("studentId")}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a student</option>
              {relatedData?.students?.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.surname}
                </option>
              ))}
            </select>
            {errors.studentId && (
              <p className="text-red-500 text-xs mt-1">
                {errors.studentId.message}
              </p>
            )}
          </div>

          {/* Hidden Given By (teacher or admin) */}
          <input type="hidden" {...register("givenById")} />

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              {...register("date")}
              className="w-full p-2 border rounded"
            />
            {errors.date && (
              <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>
            )}
          </div>

          {/* Comment */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Comment</label>
            <textarea
              {...register("comment")}
              rows={3}
              className="w-full p-2 border rounded resize-none"
              placeholder="Enter additional comments..."
            />
            {errors.comment && (
              <p className="text-red-500 text-xs mt-1">
                {errors.comment.message}
              </p>
            )}
          </div>

          {data?.id && (
            <input type="hidden" {...register("id")} value={data.id} />
          )}
        </div>
      </fieldset>

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

export default IncidentForm;