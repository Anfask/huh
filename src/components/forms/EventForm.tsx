"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useTransition } from "react";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { eventSchema, type EventSchema } from "@/lib/formValidationSchemas";
import { createEvent, updateEvent } from "@/lib/actions";

const EventForm = ({
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
  const formatDateTimeLocal = (date: Date | string) => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return "";

    // Get the timezone offset in minutes and convert to milliseconds
    const timezoneOffset = dateObj.getTimezoneOffset() * 60000;

    // Create a new date adjusted for timezone to get local time
    const localDate = new Date(dateObj.getTime() - timezoneOffset);

    // Return in the format needed for datetime-local input
    return localDate.toISOString().slice(0, 16);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventSchema>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: data?.title || "",
      description: data?.description || "",
      startTime: formatDateTimeLocal(data?.startTime),
      endTime: formatDateTimeLocal(data?.endTime),
      classId: data?.classId?.toString() || "",
      id: data?.id || undefined,
    },
  });

  const [state, formAction] = useActionState(
    type === "create" ? createEvent : updateEvent,
    { success: false, error: false, errorMessage: "" }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { classes = [] } = relatedData || {};

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction(formData);
    });
  });

  useEffect(() => {
    if (state.success) {
      toast.success(
        `Event ${type === "create" ? "created" : "updated"} successfully!`
      );
      setOpen(false);
      router.refresh();
    }
  }, [state, type, setOpen, router]);

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-semibold">
        {type === "create" ? "Create Event" : "Update Event"}
      </h2>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">
          Event Details
        </legend>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              {...register("title")}
              className="w-full p-2 border rounded"
              required
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              {...register("description")}
              className="w-full p-2 border rounded min-h-[100px]"
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">
                {errors.description.message}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">Schedule</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Time</label>
            <input
              type="datetime-local"
              {...register("startTime")}
              className="w-full p-2 border rounded"
              required
            />
            {errors.startTime && (
              <p className="text-xs text-red-500 mt-1">
                {errors.startTime.message}
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
            {errors.endTime && (
              <p className="text-xs text-red-500 mt-1">
                {errors.endTime.message}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">
          Class Information
        </legend>
        <div>
          <label className="block text-sm font-medium mb-1">Class</label>
          <select
            {...register("classId")}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Class</option>
            {classes?.map((cls: any) => (
              <option key={cls.id} value={cls.id.toString()}>
                {cls.name} - {cls.grade} {cls.section ? `(${cls.section})` : ""}
              </option>
            ))}
          </select>
          {errors.classId && (
            <p className="text-xs text-red-500 mt-1">
              {errors.classId.message}
            </p>
          )}
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

export default EventForm;
